import type { Client, Order, OrderItem } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAddress } from "@/lib/format";
import { decrypt } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { CARRIERS } from "@/lib/types";
import { internalTrackingNumber, mergePdfs, renderInternalLabel } from "./packia";
import * as sendcloud from "./sendcloud";
import { getBrand } from "@/lib/brand";

export { sendcloudEnabled, listShippingMethods } from "./sendcloud";
export { mergePdfs };

type FullOrder = Order & { items: OrderItem[]; client: Client };

/** Claves de Sendcloud para un cliente: las suyas propias o, si no tiene, las de Packia. */
export async function sendcloudKeysFor(client: Pick<Client, "sendcloudPublicKey" | "sendcloudSecretKey">) {
  const own = { publicKey: decrypt(client.sendcloudPublicKey) ?? "", secretKey: decrypt(client.sendcloudSecretKey) ?? "" };
  if (own.publicKey && own.secretKey) return { keys: own, own: true };
  const global = (await getSettings()).sendcloud;
  return global.publicKey && global.secretKey ? { keys: global, own: false } : null;
}

export type ShippingOption = { value: string; label: string; group: string };

/** Opciones de envío para un cliente (métodos de su Sendcloud + etiqueta Packia) y la elegida por defecto. */
export async function shippingOptionsFor(client: Client): Promise<{ options: ShippingOption[]; defaultValue: string; error?: string }> {
  const options: ShippingOption[] = [];
  let error: string | undefined;
  const sc = await sendcloudKeysFor(client);
  if (sc) {
    try {
      const methods = await sendcloud.listShippingMethods(sc.keys);
      const group = sc.own ? `Sendcloud de ${client.name}` : `Sendcloud de ${(await getBrand()).name}`;
      options.push(...methods.map((m) => ({ value: `sendcloud:${m.id}`, label: m.name, group })));
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  const brand = (await getBrand()).name;
  options.push(...CARRIERS.map((c) => ({ value: `packia:${c}`, label: `${c} · etiqueta ${brand}`, group: `Etiqueta ${brand} (interna)` })));
  const defaultValue = client.defaultShipping && options.some((o) => o.value === client.defaultShipping) ? client.defaultShipping : options[0].value;
  return { options, defaultValue, error };
}

/** Peso estimado: suma de los pesos de producto conocidos + 150 g de embalaje (mínimo 250 g). */
export async function estimateWeight(order: FullOrder): Promise<number> {
  const products = await db.product.findMany({ where: { clientId: order.clientId, sku: { in: order.items.map((i) => i.sku) } } });
  const bySku = new Map(products.map((p) => [p.sku, p.weightGrams ?? 0]));
  const grams = order.items.reduce((s, i) => s + (bySku.get(i.sku) ?? 0) * i.quantity, 0);
  return Math.max(250, grams + 150);
}

export type LabelRequest =
  | { provider: "PACKIA"; carrier: string; weightGrams: number }
  | { provider: "SENDCLOUD"; shippingMethodId: number; weightGrams: number };

/** Crea la etiqueta y devuelve los datos de envío (no cambia el pedido). */
export async function createLabel(order: FullOrder, req: LabelRequest) {
  if (req.provider === "SENDCLOUD") {
    const sc = await sendcloudKeysFor(order.client);
    if (!sc) throw new Error("Sendcloud no está configurado para este cliente ni en Ajustes");
    const parcel = await sendcloud.createParcel({
      keys: sc.keys,
      orderNumber: order.number,
      email: order.email,
      address: parseAddress(order.shippingAddress),
      weightGrams: req.weightGrams,
      shippingMethodId: req.shippingMethodId,
    });
    return {
      carrier: parcel.carrier,
      trackingNumber: parcel.trackingNumber,
      trackingUrl: parcel.trackingUrl,
      labelProvider: "SENDCLOUD" as const,
      labelRef: parcel.parcelId,
      weightGrams: req.weightGrams,
    };
  }
  return {
    carrier: req.carrier,
    trackingNumber: internalTrackingNumber(),
    labelProvider: "PACKIA" as const,
    weightGrams: req.weightGrams,
  };
}

/** PDF de la etiqueta de un pedido ya enviado. */
export async function labelPdf(order: FullOrder): Promise<Uint8Array> {
  if (order.labelProvider === "SENDCLOUD" && order.labelRef) {
    const sc = await sendcloudKeysFor(order.client);
    if (!sc) throw new Error("Sendcloud no está configurado para este cliente");
    return sendcloud.fetchLabelPdf(order.labelRef, sc.keys);
  }
  if (order.labelProvider === "PACKIA" && order.trackingNumber) {
    return renderInternalLabel({
      orderNumber: order.number,
      clientName: order.client.name,
      carrier: order.carrier ?? "",
      trackingNumber: order.trackingNumber,
      weightGrams: order.weightGrams ?? 500,
      units: order.items.reduce((s, i) => s + i.quantity, 0),
      address: parseAddress(order.shippingAddress),
    });
  }
  throw new Error("Este pedido no tiene etiqueta interna generada");
}
