"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shipOrder, syncStore, testStoreConnection } from "@/lib/sync";
import { ORDER_FLOW, PLANS, type OrderStatus, type Plan } from "@/lib/types";

export type FormState = { error?: string; success?: string; values?: Record<string, string> } | undefined;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** React vacía el formulario tras la acción: devolvemos lo escrito (sin secretos) para no perderlo si hay error. */
const keep = (form: FormData, fields: string[]) => Object.fromEntries(fields.map((f) => [f, str(form.get(f))]));

export async function createClient(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form.get("name"));
  const plan = (str(form.get("plan")) || "ARRANQUE") as Plan;
  const values = keep(form, ["name", "contactEmail", "plan"]);
  if (!name) return { error: "El nombre es obligatorio", values };
  if (!(plan in PLANS)) return { error: "Plan no válido", values };
  await db.client.create({
    data: { name, contactEmail: str(form.get("contactEmail")) || null, plan, planOrders: PLANS[plan].orders },
  });
  revalidatePath("/clientes");
  return { success: `Cliente «${name}» creado` };
}

export async function connectStore(_: FormState, form: FormData): Promise<FormState> {
  const platform = str(form.get("platform"));
  const clientId = str(form.get("clientId"));
  const name = str(form.get("name"));
  let domain = str(form.get("domain")).toLowerCase();
  const values = keep(form, ["platform", "clientId", "name", "domain", "consumerKey"]);

  if (!clientId) return { error: "Elige un cliente", values };
  if (!name || !domain) return { error: "Nombre y dominio son obligatorios", values };

  if (platform === "SHOPIFY") {
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain.endsWith(".myshopify.com")) return { error: "Usa el dominio interno: mitienda.myshopify.com", values };
    if (!str(form.get("accessToken"))) return { error: "Falta el token de acceso de la Admin API", values };
  } else if (platform === "WOOCOMMERCE") {
    if (!domain.startsWith("http")) domain = `https://${domain}`;
    domain = domain.replace(/\/+$/, "");
    if (!str(form.get("consumerKey")) || !str(form.get("consumerSecret"))) return { error: "Faltan las claves de la REST API", values };
  } else {
    return { error: "Plataforma no válida", values };
  }

  const draft = {
    clientId,
    platform,
    name,
    domain,
    accessToken: str(form.get("accessToken")) || null,
    consumerKey: str(form.get("consumerKey")) || null,
    consumerSecret: str(form.get("consumerSecret")) || null,
    // Shopify: el "secreto de API" de la app. WooCommerce: lo generamos para el webhook.
    webhookSecret: str(form.get("webhookSecret")) || (platform === "WOOCOMMERCE" ? crypto.randomBytes(24).toString("hex") : null),
  };

  try {
    await testStoreConnection({ ...draft, id: "", isDemo: false, lastSyncAt: null, lastSyncError: null, createdAt: new Date() });
  } catch (err) {
    return { error: `No hemos podido conectar: ${err instanceof Error ? err.message : String(err)}`, values };
  }

  const exists = await db.store.findUnique({ where: { platform_domain: { platform, domain } } });
  if (exists) return { error: "Esa tienda ya está conectada", values };

  const store = await db.store.create({ data: draft });
  try {
    await syncStore(store.id);
  } catch {
    // El error queda guardado en la tienda y se muestra en su ficha.
  }
  revalidatePath("/", "layout");
  redirect(`/tiendas/${store.id}`);
}

export async function syncStoreAction(storeId: string): Promise<FormState> {
  try {
    const r = await syncStore(storeId);
    revalidatePath("/", "layout");
    return { success: `${r.orders} pedidos nuevos · ${r.products} productos actualizados` };
  } catch (err) {
    revalidatePath("/", "layout");
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function advanceOrder(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const i = ORDER_FLOW.indexOf(order.status as OrderStatus);
  const next = ORDER_FLOW[i + 1];
  // El paso a "Enviado" exige seguimiento: se hace con shipOrderAction.
  if (i < 0 || !next || next === "SHIPPED") return;
  await db.order.update({ where: { id: orderId }, data: { status: next } });
  revalidatePath("/", "layout");
}

export async function shipOrderAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const carrier = str(form.get("carrier"));
  const trackingNumber = str(form.get("trackingNumber"));
  if (!carrier || !trackingNumber) return { error: "Agencia y número de seguimiento son obligatorios", values: keep(form, ["carrier", "trackingNumber"]) };
  await shipOrder(orderId, { carrier, trackingNumber });
  const order = await db.order.findUnique({ where: { id: orderId } });
  revalidatePath("/", "layout");
  if (order?.syncError) return { error: `Enviado, pero no se pudo avisar a la tienda: ${order.syncError}` };
  return { success: "Pedido enviado y seguimiento enviado a la tienda" };
}

export async function updateProduct(productId: string, _: FormState, form: FormData): Promise<FormState> {
  const stock = Number(str(form.get("stock")));
  const lowStockAt = Number(str(form.get("lowStockAt")));
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock no válido" };
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0) return { error: "Umbral no válido" };
  await db.product.update({
    where: { id: productId },
    data: { stock, lowStockAt, location: str(form.get("location")).toUpperCase() || null },
  });
  revalidatePath("/inventario");
  return { success: "Guardado" };
}
