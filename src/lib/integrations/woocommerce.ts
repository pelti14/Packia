import crypto from "node:crypto";
import type { ExternalOrder, ExternalProduct, Shipment } from "@/lib/types";

type WooCreds = { domain: string; consumerKey: string; consumerSecret: string };

async function wc<T>(creds: WooCreds, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = creds.domain.replace(/\/+$/, "");
  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wc/v3${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WooCommerce respondió ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

type WooAddress = {
  first_name: string; last_name: string; address_1: string; address_2: string;
  city: string; postcode: string; state: string; country: string; phone?: string;
};

export type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created_gmt: string;
  billing: WooAddress & { email: string };
  shipping: WooAddress;
  line_items: { id: number; sku: string; name: string; quantity: number; product_id: number }[];
};

export async function testConnection(creds: WooCreds): Promise<string> {
  const data = await wc<{ environment: { site_url: string } }>(creds, "/system_status");
  return data.environment.site_url;
}

export function orderFromWoo(o: WooOrder): ExternalOrder {
  // Si no hay dirección de envío, WooCommerce deja "shipping" vacío y usamos la de facturación.
  const s = o.shipping?.address_1 ? o.shipping : o.billing;
  const name = `${s.first_name} ${s.last_name}`.trim();
  return {
    externalId: String(o.id),
    number: `#${o.number}`,
    placedAt: new Date(o.date_created_gmt.endsWith("Z") ? o.date_created_gmt : `${o.date_created_gmt}Z`),
    customerName: name || "Sin nombre",
    email: o.billing?.email || undefined,
    cancelled: o.status === "cancelled" || o.status === "refunded",
    shippingAddress: {
      name,
      address1: s.address_1,
      address2: s.address_2 || undefined,
      city: s.city,
      zip: s.postcode,
      province: s.state || undefined,
      country: s.country,
      phone: o.shipping?.phone || o.billing?.phone || undefined,
    },
    items: o.line_items.map((li) => ({
      externalLineId: String(li.id),
      sku: li.sku || String(li.product_id),
      name: li.name,
      quantity: li.quantity,
    })),
  };
}

/** Pedidos pagados ("processing") pendientes de preparar. */
export async function fetchOpenOrders(creds: WooCreds): Promise<ExternalOrder[]> {
  const orders = await wc<WooOrder[]>(creds, "/orders?status=processing&per_page=100&orderby=date&order=desc");
  return orders.map(orderFromWoo);
}

export async function fetchProducts(creds: WooCreds): Promise<ExternalProduct[]> {
  const products = await wc<{ id: number; sku: string; name: string; type: string; images: { src: string }[] }[]>(
    creds,
    "/products?per_page=100&status=publish",
  );
  const result: ExternalProduct[] = [];
  for (const p of products) {
    if (p.type === "variable") {
      const variations = await wc<{ id: number; sku: string; attributes: { option: string }[]; image: { src: string } | null }[]>(
        creds,
        `/products/${p.id}/variations?per_page=100`,
      );
      for (const v of variations) {
        if (!v.sku) continue;
        result.push({
          externalId: String(v.id),
          sku: v.sku,
          name: `${p.name} — ${v.attributes.map((a) => a.option).join(" / ")}`,
          imageUrl: v.image?.src ?? p.images[0]?.src,
        });
      }
    } else if (p.sku) {
      result.push({ externalId: String(p.id), sku: p.sku, name: p.name, imageUrl: p.images[0]?.src });
    }
  }
  return result;
}

/** Completa el pedido y deja el seguimiento como nota visible para el cliente. */
export async function fulfillOrder(creds: WooCreds, externalOrderId: string, shipment: Shipment) {
  await wc(creds, `/orders/${externalOrderId}`, {
    method: "PUT",
    body: {
      status: "completed",
      meta_data: [
        { key: "_packia_carrier", value: shipment.carrier },
        { key: "_packia_tracking_number", value: shipment.trackingNumber },
      ],
    },
  });
  const link = shipment.trackingUrl ? ` ${shipment.trackingUrl}` : "";
  await wc(creds, `/orders/${externalOrderId}/notes`, {
    method: "POST",
    body: {
      note: `Tu pedido ha salido con ${shipment.carrier}. Número de seguimiento: ${shipment.trackingNumber}.${link}`,
      customer_note: true,
    },
  });
}

/** Verifica la cabecera X-WC-Webhook-Signature. */
export function verifyWebhook(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
