import type { Store } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import * as shopify from "@/lib/integrations/shopify";
import * as woo from "@/lib/integrations/woocommerce";
import type { ExternalOrder, ExternalProduct, Shipment } from "@/lib/types";

type StoreCreds = Pick<Store, "platform" | "domain" | "accessToken" | "consumerKey" | "consumerSecret">;

function shopifyCreds(store: StoreCreds) {
  const accessToken = decrypt(store.accessToken);
  if (!accessToken) throw new Error("Falta el token de acceso de Shopify");
  return { domain: store.domain, accessToken };
}

function wooCreds(store: StoreCreds) {
  const consumerKey = decrypt(store.consumerKey);
  const consumerSecret = decrypt(store.consumerSecret);
  if (!consumerKey || !consumerSecret) throw new Error("Faltan las claves de la API de WooCommerce");
  return { domain: store.domain, consumerKey, consumerSecret };
}

/** Prueba credenciales (cifradas o en claro) antes de guardar una tienda. */
export async function testStoreConnection(store: StoreCreds): Promise<string> {
  return store.platform === "SHOPIFY"
    ? shopify.testConnection(shopifyCreds(store))
    : woo.testConnection(wooCreds(store));
}

/**
 * Guarda pedidos nuevos. Un pedido ya importado no se toca (su estado lo lleva el almacén),
 * salvo que la tienda lo haya cancelado antes de enviarse.
 */
export async function upsertOrders(store: Store, orders: ExternalOrder[]): Promise<number> {
  let created = 0;
  for (const o of orders) {
    const existing = await db.order.findUnique({
      where: { storeId_externalId: { storeId: store.id, externalId: o.externalId } },
    });
    if (existing) {
      if (o.cancelled && existing.status !== "SHIPPED" && existing.status !== "CANCELLED") {
        await db.order.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
      }
      continue;
    }
    if (o.cancelled) continue;
    await db.order.create({
      data: {
        clientId: store.clientId,
        storeId: store.id,
        externalId: o.externalId,
        number: o.number,
        customerName: o.customerName,
        email: o.email,
        shippingAddress: JSON.stringify(o.shippingAddress),
        placedAt: o.placedAt,
        items: { create: o.items },
      },
    });
    created++;
  }
  return created;
}

async function upsertProducts(store: Store, products: ExternalProduct[]) {
  for (const p of products) {
    await db.product.upsert({
      where: { clientId_sku: { clientId: store.clientId, sku: p.sku } },
      // El stock físico lo controla el almacén, nunca la tienda.
      create: { clientId: store.clientId, storeId: store.id, externalId: p.externalId, sku: p.sku, name: p.name, imageUrl: p.imageUrl },
      update: { storeId: store.id, externalId: p.externalId, name: p.name, imageUrl: p.imageUrl },
    });
  }
}

export async function syncStore(storeId: string): Promise<{ orders: number; products: number }> {
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  if (store.isDemo) {
    await db.store.update({ where: { id: store.id }, data: { lastSyncAt: new Date(), lastSyncError: null } });
    return { orders: 0, products: 0 };
  }
  try {
    const [products, orders] =
      store.platform === "SHOPIFY"
        ? await Promise.all([shopify.fetchProducts(shopifyCreds(store)), shopify.fetchOpenOrders(shopifyCreds(store))])
        : await Promise.all([woo.fetchProducts(wooCreds(store)), woo.fetchOpenOrders(wooCreds(store))]);
    await upsertProducts(store, products);
    const created = await upsertOrders(store, orders);
    await db.store.update({ where: { id: store.id }, data: { lastSyncAt: new Date(), lastSyncError: null } });
    return { orders: created, products: products.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.store.update({ where: { id: store.id }, data: { lastSyncError: message } });
    throw err;
  }
}

/**
 * Marca el pedido como enviado: descuenta stock, guarda el seguimiento
 * y lo devuelve a la tienda para que el cliente final reciba el aviso.
 */
export async function shipOrder(orderId: string, shipment: Shipment) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { store: true, items: true } });
  if (order.status === "SHIPPED") return;

  let syncError: string | null = null;
  if (!order.store.isDemo) {
    try {
      if (order.store.platform === "SHOPIFY") {
        await shopify.fulfillOrder(shopifyCreds(order.store), order.externalId, shipment);
      } else {
        await woo.fulfillOrder(wooCreds(order.store), order.externalId, shipment);
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
    }
  }

  await db.$transaction([
    ...order.items.map((item) =>
      db.product.updateMany({
        where: { clientId: order.clientId, sku: item.sku },
        data: { stock: { decrement: item.quantity } },
      }),
    ),
    db.order.update({
      where: { id: order.id },
      data: {
        status: "SHIPPED",
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        labelProvider: shipment.labelProvider ?? "MANUAL",
        labelRef: shipment.labelRef,
        weightGrams: shipment.weightGrams,
        shippedAt: new Date(),
        syncError,
      },
    }),
  ]);
}
