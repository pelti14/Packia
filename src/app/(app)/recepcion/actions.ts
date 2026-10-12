"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

type Line = { sku: string; name: string; qty: number };

/** Aviso de entrada de mercancía. Lo puede crear el almacén o el propio cliente. */
export async function createInbound(_: FormState, form: FormData): Promise<FormState> {
  const user = await assertRole(["ADMIN", "STAFF", "CLIENT"]);
  const clientId = user.role === "CLIENT" ? user.clientId : str(form.get("clientId"));
  const reference = str(form.get("reference"));
  const values = Object.fromEntries(["clientId", "reference", "carrier", "boxes", "expectedAt", "notes", "lines"].map((k) => [k, str(form.get(k))]));
  if (!clientId) return { error: "Elige un cliente", values };
  if (!reference) return { error: "Indica una referencia (albarán o nº de pedido al proveedor)", values };

  let lines: Line[];
  try {
    lines = (JSON.parse(values.lines || "[]") as Line[])
      .map((l) => ({ sku: String(l.sku).trim().toUpperCase(), name: String(l.name).trim(), qty: Math.floor(Number(l.qty)) }))
      .filter((l) => l.sku && l.qty > 0);
  } catch {
    return { error: "Líneas no válidas", values };
  }
  if (!lines.length) return { error: "Añade al menos una referencia con cantidad", values };

  const boxes = Number(values.boxes);
  const inbound = await db.inbound.create({
    data: {
      clientId,
      reference,
      carrier: values.carrier || null,
      boxes: Number.isInteger(boxes) && boxes > 0 ? boxes : null,
      notes: values.notes || null,
      expectedAt: values.expectedAt ? new Date(`${values.expectedAt}T12:00:00`) : null,
      items: { create: lines.map((l) => ({ sku: l.sku, name: l.name || l.sku, expectedQty: l.qty })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/recepcion/${inbound.id}`);
}

/** Confirma la recepción: suma al stock lo recibido en buen estado. */
export async function receiveInbound(inboundId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const inbound = await db.inbound.findUniqueOrThrow({ where: { id: inboundId }, include: { items: true } });
  if (inbound.status === "RECEIVED") return { error: "Esta recepción ya está confirmada" };

  const counts = inbound.items.map((item) => ({
    item,
    received: Number(str(form.get(`received_${item.id}`))),
    damaged: Number(str(form.get(`damaged_${item.id}`)) || "0"),
    location: str(form.get(`location_${item.id}`)).toUpperCase(),
  }));
  for (const c of counts) {
    if (!Number.isInteger(c.received) || c.received < 0 || !Number.isInteger(c.damaged) || c.damaged < 0 || c.damaged > c.received) {
      return { error: `Revisa las cantidades de ${c.item.sku}` };
    }
  }

  await db.$transaction(async (tx) => {
    for (const c of counts) {
      await tx.inboundItem.update({ where: { id: c.item.id }, data: { receivedQty: c.received, damagedQty: c.damaged } });
      const good = c.received - c.damaged;
      await tx.product.upsert({
        where: { clientId_sku: { clientId: inbound.clientId, sku: c.item.sku } },
        create: { clientId: inbound.clientId, sku: c.item.sku, name: c.item.name, stock: good, location: c.location || null },
        update: { stock: { increment: good }, ...(c.location && { location: c.location }) },
      });
    }
    await tx.inbound.update({ where: { id: inboundId }, data: { status: "RECEIVED", receivedAt: new Date() } });
  });
  revalidatePath("/", "layout");
  return { success: "Recepción confirmada y stock actualizado" };
}
