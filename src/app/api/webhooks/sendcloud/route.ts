import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { notifyBuyerLater } from "@/lib/tracking";
import { verifyWebhook } from "@/lib/labels/sendcloud";

export const dynamic = "force-dynamic";

const DELIVERED = 11; // Sendcloud: «Delivered»

/**
 * Cambios de estado de los paquetes de Sendcloud (Webhook URL de la integración).
 * Vale la clave general (Ajustes) o la de cualquier cliente con Sendcloud propio.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("sendcloud-signature");
  const secrets = [(await getSettings()).sendcloud.secretKey];
  for (const c of await db.client.findMany({ where: { sendcloudSecretKey: { not: null } }, select: { sendcloudSecretKey: true } })) secrets.push(decrypt(c.sendcloudSecretKey) ?? "");
  if (!secrets.some((s) => verifyWebhook(raw, sig, s))) return NextResponse.json({ error: "Firma no válida" }, { status: 401 });

  const body = JSON.parse(raw) as { action?: string; parcel?: { id?: number; status?: { id?: number; message?: string } } };
  const parcel = body.parcel;
  if (body.action !== "parcel_status_changed" || !parcel?.id) return NextResponse.json({ ok: true });
  const order = await db.order.findFirst({ where: { labelProvider: "SENDCLOUD", labelRef: String(parcel.id) }, select: { id: true, deliveredAt: true } });
  if (!order) return NextResponse.json({ ok: true });
  const delivered = parcel.status?.id === DELIVERED;
  await db.order.update({
    where: { id: order.id },
    data: { carrierStatus: parcel.status?.message?.slice(0, 120) ?? null, ...(delivered && !order.deliveredAt ? { deliveredAt: new Date() } : {}) },
  });
  if (delivered) notifyBuyerLater(order.id, "DELIVERED");
  return NextResponse.json({ ok: true });
}
