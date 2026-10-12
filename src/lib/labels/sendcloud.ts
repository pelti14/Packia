import type { Address } from "@/lib/types";
import { countryCode } from "./sender";

/**
 * Sendcloud: crea el envío en la agencia elegida y devuelve la etiqueta oficial.
 * Documentación: https://api.sendcloud.dev/docs/sendcloud-public-api/
 */
const BASE = process.env.SENDCLOUD_API_URL ?? "https://panel.sendcloud.sc/api/v2";

export function sendcloudEnabled() {
  return Boolean(process.env.SENDCLOUD_PUBLIC_KEY && process.env.SENDCLOUD_SECRET_KEY);
}

function auth() {
  const token = Buffer.from(`${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sendcloud respondió ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export type ShippingMethod = { id: number; name: string; carrier: string; minWeight: number; maxWeight: number };

/** Métodos de envío activos en la cuenta de Sendcloud. */
export async function listShippingMethods(): Promise<ShippingMethod[]> {
  if (!sendcloudEnabled()) return [];
  const data = await call<{ shipping_methods: { id: number; name: string; carrier: string; min_weight: string; max_weight: string }[] }>(
    "/shipping_methods",
  );
  return data.shipping_methods
    .filter((m) => m.id !== 8) // 8 = "Unstamped letter", no genera etiqueta
    .map((m) => ({ id: m.id, name: m.name, carrier: m.carrier, minWeight: Number(m.min_weight), maxWeight: Number(m.max_weight) }));
}

export async function createParcel(input: {
  orderNumber: string;
  email?: string | null;
  address: Address;
  weightGrams: number;
  shippingMethodId: number;
}) {
  const a = input.address;
  // Sendcloud pide el número de la calle aparte; si va al final de la dirección, lo separamos.
  const match = a.address1.match(/^(.*?)[,\s]+(\d+[a-zA-Z]?)\s*$/);
  const data = await call<{
    parcel: { id: number; tracking_number: string; tracking_url: string; carrier: { code: string } };
  }>("/parcels", {
    method: "POST",
    body: {
      parcel: {
        name: a.name,
        address: match ? match[1] : a.address1,
        house_number: match ? match[2] : "",
        address_2: a.address2 ?? "",
        city: a.city,
        postal_code: a.zip,
        country: countryCode(a),
        telephone: a.phone ?? "",
        email: input.email ?? "",
        order_number: input.orderNumber,
        weight: (input.weightGrams / 1000).toFixed(3),
        request_label: true,
        shipment: { id: input.shippingMethodId },
      },
    },
  });
  return {
    parcelId: String(data.parcel.id),
    trackingNumber: data.parcel.tracking_number,
    trackingUrl: data.parcel.tracking_url,
    carrier: data.parcel.carrier.code.toUpperCase(),
  };
}

/** PDF A6 de la etiqueta para impresora térmica. */
export async function fetchLabelPdf(parcelId: string): Promise<Uint8Array> {
  const res = await fetch(`${BASE}/labels/label_printer/${parcelId}`, { headers: auth(), cache: "no-store" });
  if (!res.ok) throw new Error(`Sendcloud respondió ${res.status} al descargar la etiqueta`);
  return new Uint8Array(await res.arrayBuffer());
}
