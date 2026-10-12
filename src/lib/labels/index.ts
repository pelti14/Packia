import type { Client, Order, OrderItem } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAddress } from "@/lib/format";
import { internalTrackingNumber, mergePdfs, renderInternalLabel } from "./packia";
import * as sendcloud from "./sendcloud";

export { sendcloudEnabled, listShippingMethods } from "./sendcloud";
export { mergePdfs };

type FullOrder = Order & { items: OrderItem[]; client: Client };

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
    const parcel = await sendcloud.createParcel({
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
  if (order.labelProvider === "SENDCLOUD" && order.labelRef) return sendcloud.fetchLabelPdf(order.labelRef);
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
  throw new Error("Este pedido no tiene etiqueta generada por Packia");
}
