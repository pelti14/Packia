"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, canAccessClient } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Anuncia una devolución de un pedido enviado. */
export async function createReturn(_: FormState, form: FormData): Promise<FormState> {
  const user = await assertRole(["ADMIN", "STAFF", "CLIENT"]);
  const orderId = str(form.get("orderId"));
  if (!orderId) return { error: "Elige el pedido" };
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || !canAccessClient(user, order.clientId)) return { error: "Pedido no encontrado" };
  if (order.status !== "SHIPPED") return { error: "Solo se pueden devolver pedidos enviados" };

  const lines = order.items
    .map((item) => ({ item, qty: Number(str(form.get(`qty_${item.id}`)) || "0") }))
    .filter((l) => l.qty > 0);
  if (!lines.length) return { error: "Indica al menos una unidad a devolver" };
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty > l.item.quantity) return { error: `Cantidad no válida para ${l.item.sku}` };
  }

  const ret = await db.return.create({
    data: {
      clientId: order.clientId,
      orderId: order.id,
      reason: str(form.get("reason")) || null,
      items: { create: lines.map((l) => ({ sku: l.item.sku, name: l.item.name, quantity: l.qty })) },
    },
  });
  if (user.role === "CLIENT") {
    await notify({ title: `Devolución anunciada · ${order.number}`, body: user.clientName ?? undefined, href: `/devoluciones/${ret.id}`, clientId: order.clientId, tone: "info" });
  }
  revalidatePath("/", "layout");
  redirect(`/devoluciones/${ret.id}`);
}

export async function markReturnReceived(returnId: string) {
  await assertRole(["ADMIN", "STAFF"]);
  await db.return.updateMany({ where: { id: returnId, status: "ANNOUNCED" }, data: { status: "RECEIVED", receivedAt: new Date() } });
  revalidatePath("/", "layout");
}

/** Revisa cada unidad: lo vendible vuelve a stock; lo dañado queda apartado. */
export async function processReturn(returnId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const ret = await db.return.findUniqueOrThrow({ where: { id: returnId }, include: { items: true } });
  if (ret.status === "PROCESSED") return { error: "Esta devolución ya está procesada" };

  const decisions = ret.items.map((item) => ({ item, condition: str(form.get(`condition_${item.id}`)) }));
  if (decisions.some((d) => d.condition !== "RESTOCK" && d.condition !== "DAMAGED")) return { error: "Indica el estado de cada producto" };

  await db.$transaction(async (tx) => {
    for (const d of decisions) {
      await tx.returnItem.update({ where: { id: d.item.id }, data: { condition: d.condition } });
      if (d.condition === "RESTOCK") {
        await tx.product.updateMany({ where: { clientId: ret.clientId, sku: d.item.sku }, data: { stock: { increment: d.item.quantity } } });
      }
    }
    await tx.return.update({
      where: { id: returnId },
      data: { status: "PROCESSED", processedAt: new Date(), receivedAt: ret.receivedAt ?? new Date() },
    });
  });
  const restocked = decisions.filter((d) => d.condition === "RESTOCK").reduce((n, d) => n + d.item.quantity, 0);
  await notify({ title: "Devolución procesada", body: `${restocked} uds. vuelven a stock`, href: `/devoluciones/${returnId}`, clientId: ret.clientId, tone: "success", audience: "ALL" });
  revalidatePath("/", "layout");
  return { success: "Devolución procesada" };
}
