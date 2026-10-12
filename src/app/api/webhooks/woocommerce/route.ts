import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderFromWoo, verifyWebhook, type WooOrder } from "@/lib/integrations/woocommerce";
import { upsertOrders } from "@/lib/sync";

export const runtime = "nodejs";

function normalize(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

/** Recibe order.created y order.updated. */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const topic = req.headers.get("x-wc-webhook-topic") ?? "";
  const source = req.headers.get("x-wc-webhook-source");

  // Al crear el webhook, WooCommerce envía un "ping" sin firma; respondemos 200 para que lo active.
  if (!topic) return NextResponse.json({ ok: true });

  const stores = await db.store.findMany({ where: { platform: "WOOCOMMERCE" } });
  const store = source ? stores.find((s) => normalize(s.domain) === normalize(source)) : undefined;
  if (!store?.webhookSecret) return NextResponse.json({ error: "Tienda desconocida" }, { status: 404 });

  if (!verifyWebhook(rawBody, req.headers.get("x-wc-webhook-signature"), store.webhookSecret)) {
    return NextResponse.json({ error: "Firma no válida" }, { status: 401 });
  }

  if (topic.startsWith("order.")) {
    const order = JSON.parse(rawBody) as WooOrder;
    // Solo entran a la cola los pedidos pagados; los cancelados se marcan si ya existían.
    if (order.status === "processing" || order.status === "cancelled" || order.status === "refunded") {
      await upsertOrders(store, [orderFromWoo(order)]);
    }
  }
  return NextResponse.json({ ok: true });
}
