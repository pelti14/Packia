import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { orderFromWebhook, verifyWebhook } from "@/lib/integrations/shopify";
import { upsertOrders } from "@/lib/sync";

export const runtime = "nodejs";

/** Recibe orders/create, orders/paid, orders/updated y orders/cancelled. */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const domain = req.headers.get("x-shopify-shop-domain");
  const topic = req.headers.get("x-shopify-topic") ?? "";

  const store = domain ? await db.store.findFirst({ where: { platform: "SHOPIFY", domain } }) : null;
  const secret = decrypt(store?.webhookSecret);
  if (!store || !secret) return NextResponse.json({ error: "Tienda desconocida" }, { status: 404 });

  if (!verifyWebhook(rawBody, req.headers.get("x-shopify-hmac-sha256"), secret)) {
    return NextResponse.json({ error: "Firma no válida" }, { status: 401 });
  }

  if (topic.startsWith("orders/")) {
    await upsertOrders(store, [orderFromWebhook(JSON.parse(rawBody))]);
  }
  return NextResponse.json({ ok: true });
}
