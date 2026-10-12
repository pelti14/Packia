import type { Store } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { notify } from "@/lib/notifications";
import { ensureCustomersBackfilled, recordCustomer } from "@/lib/customers";
import * as shopify from "@/lib/integrations/shopify";
import * as woo from "@/lib/integrations/woocommerce";
import type { ExternalOrder, ExternalProduct, Shipment } from "@/lib/types";

type StoreCreds = Pick<Store, "platform" | "domain" | "accessToken" | "consumerKey" | "consumerSecret"> &
  Partial<Pick<Store, "id" | "shopifyClientId" | "shopifyClientSecret" | "tokenExpiresAt">>;

/**
 * Credenciales de Shopify. App del Dev Dashboard: usa el token en caché si le quedan
 * más de 5 minutos; si no, pide uno nuevo y lo guarda cifrado. App antigua: token fijo.
 */
async function shopifyCreds(store: StoreCreds) {
  const clientId = decrypt(store.shopifyClientId);
  const clientSecret = decrypt(store.shopifyClientSecret);
  if (clientId && clientSecret) {
    const cached = decrypt(store.accessToken);
    if (cached && store.tokenExpiresAt && store.tokenExpiresAt.getTime() - Date.now() > 5 * 60_000) {
      return { domain: store.domain, accessToken: cached };
    }
    const fresh = await shopify.clientCredentialsToken(store.domain, clientId, clientSecret);
    if (store.id) {
      await db.store.update({ where: { id: store.id }, data: { accessToken: encrypt(fresh.accessToken), tokenExpiresAt: fresh.expiresAt } });
    }
    return { domain: store.domain, accessToken: fresh.accessToken };
  }
  const accessToken = decrypt(store.accessToken);
  if (!accessToken) throw new Error("Faltan las credenciales de Shopify");
  return { domain: store.domain, accessToken };
}

/** Crea en Shopify los webhooks de pedidos que apuntan a esta instalación de Packia. */
export async function registerShopifyWebhooks(storeId: string, appUrl: string) {
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  if (store.platform !== "SHOPIFY" || store.isDemo) return [];
  return shopify.registerWebhooks(await shopifyCreds(store), `${appUrl.replace(/\/+$/, "")}/api/webhooks/shopify`);
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
    ? shopify.testConnection(await shopifyCreds(store))
    : woo.testConnection(wooCreds(store));
}

/**
 * Guarda pedidos nuevos. Un pedido ya importado no se toca (su estado lo lleva el almacén),
 * salvo que la tienda lo haya cancelado antes de enviarse.
 */
export async function upsertOrders(store: Store, orders: ExternalOrder[]): Promise<number> {
  const createdIds: { id: string; number: string }[] = [];
  const clientName = (await db.client.findUnique({ where: { id: store.clientId }, select: { name: true } }))?.name ?? store.name;
  for (const o of orders) {
    const existing = await db.order.findUnique({
      where: { storeId_externalId: { storeId: store.id, externalId: o.externalId } },
    });
    if (existing) {
      if (o.cancelled && existing.status !== "SHIPPED" && existing.status !== "CANCELLED") {
        await db.order.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
        await notify({
          title: `Pedido ${existing.number} cancelado en la tienda`,
          body: `${clientName} · no lo prepares${existing.status !== "PENDING" ? " (ya estaba en preparación)" : ""}`,
          href: `/salida/${existing.id}`,
          clientId: store.clientId,
          tone: "danger",
        });
      }
      continue;
    }
    if (o.cancelled) continue;
    const order = await db.order.create({
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
    createdIds.push({ id: order.id, number: order.number });
    await recordCustomer({ clientId: store.clientId, storeId: store.id, customerName: o.customerName, email: o.email, placedAt: o.placedAt, shippingAddress: o.shippingAddress }).catch((err) =>
      console.error("recordCustomer:", err),
    );
  }
  if (createdIds.length === 1) {
    await notify({ title: `Pedido nuevo ${createdIds[0].number}`, body: clientName, href: `/salida/${createdIds[0].id}`, clientId: store.clientId, tone: "success" });
  } else if (createdIds.length > 1) {
    await notify({ title: `${createdIds.length} pedidos nuevos`, body: clientName, href: `/salida?client=${store.clientId}`, clientId: store.clientId, tone: "success" });
  }
  return createdIds.length;
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

const PRODUCTS_EVERY_MS = 30 * 60_000;

/**
 * Trae pedidos (y productos) de una tienda.
 * products: true siempre · "auto" solo si hace más de 30 min de la última vez (sincronización automática).
 */
export async function syncStore(storeId: string, opts: { products?: boolean | "auto" } = {}): Promise<{ orders: number; products: number }> {
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  if (store.isDemo) {
    await db.store.update({ where: { id: store.id }, data: { lastSyncAt: new Date(), lastSyncError: null } });
    return { orders: 0, products: 0 };
  }
  const mode = opts.products ?? true;
  const withProducts = mode === true || !store.productsSyncedAt || Date.now() - store.productsSyncedAt.getTime() > PRODUCTS_EVERY_MS;
  try {
    let products: ExternalProduct[] = [];
    let orders: ExternalOrder[];
    if (store.platform === "SHOPIFY") {
      const c = await shopifyCreds(store);
      [products, orders] = await Promise.all([withProducts ? shopify.fetchProducts(c) : Promise.resolve([]), shopify.fetchOpenOrders(c)]);
    } else {
      const c = wooCreds(store);
      [products, orders] = await Promise.all([withProducts ? woo.fetchProducts(c) : Promise.resolve([]), woo.fetchOpenOrders(c)]);
    }
    if (withProducts) await upsertProducts(store, products);
    const created = await upsertOrders(store, orders);
    await db.store.update({
      where: { id: store.id },
      data: { lastSyncAt: new Date(), lastSyncError: null, ...(withProducts && { productsSyncedAt: new Date() }) },
    });
    return { orders: created, products: products.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Avisamos solo del primer fallo, no cada minuto.
    if (!store.lastSyncError) {
      await notify({ title: `Error al sincronizar ${store.name}`, body: message.slice(0, 160), href: `/tiendas/${store.id}`, clientId: store.clientId, tone: "danger" });
    }
    await db.store.update({ where: { id: store.id }, data: { lastSyncError: message } });
    throw err;
  }
}

const LOCK_ID = "store-sync";

/**
 * Sincroniza todas las tiendas reales. Un cerrojo en la base de datos evita que dos
 * procesos (o dos llamadas al cron) lo hagan a la vez.
 */
export async function syncAllStores(): Promise<{ ran: boolean; stores: number; orders: number; errors: number }> {
  const now = new Date();
  await db.syncLock.upsert({ where: { id: LOCK_ID }, create: { id: LOCK_ID, lockedUntil: new Date(0) }, update: {} });
  const got = await db.syncLock.updateMany({ where: { id: LOCK_ID, lockedUntil: { lt: now } }, data: { lockedUntil: new Date(now.getTime() + 5 * 60_000) } });
  if (!got.count) return { ran: false, stores: 0, orders: 0, errors: 0 };
  let orders = 0;
  let errors = 0;
  await ensureCustomersBackfilled().catch((err) => console.error("[sync] clientes:", err));
  const stores = await db.store.findMany({ where: { isDemo: false }, select: { id: true } });
  try {
    for (const s of stores) {
      try {
        orders += (await syncStore(s.id, { products: "auto" })).orders;
      } catch {
        errors++;
      }
    }
  } finally {
    await db.syncLock.update({ where: { id: LOCK_ID }, data: { lockedUntil: new Date(0), lastRunAt: new Date() } });
  }
  return { ran: true, stores: stores.length, orders, errors };
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
        await shopify.fulfillOrder(await shopifyCreds(order.store), order.externalId, shipment);
      } else {
        await woo.fulfillOrder(wooCreds(order.store), order.externalId, shipment);
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
    }
  }

  const before = await db.product.findMany({ where: { clientId: order.clientId, sku: { in: order.items.map((i) => i.sku) } } });

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

  // Aviso de stock bajo (también al cliente) al cruzar el mínimo.
  for (const p of before) {
    const qty = order.items.filter((i) => i.sku === p.sku).reduce((n, i) => n + i.quantity, 0);
    const after = p.stock - qty;
    if (p.stock > p.lowStockAt && after <= p.lowStockAt) {
      await notify({
        title: after <= 0 ? `Agotado: ${p.name}` : `Stock bajo: ${p.name}`,
        body: `Quedan ${Math.max(0, after)} uds. · ${p.sku}`,
        href: `/inventario?q=${encodeURIComponent(p.sku)}`,
        clientId: order.clientId,
        tone: after <= 0 ? "danger" : "warning",
        audience: "ALL",
      });
    }
  }
}
