"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { createLabel, estimateWeight, type LabelRequest } from "@/lib/labels";
import { shipOrder, syncStore, testStoreConnection } from "@/lib/sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CARRIERS, ORDER_FLOW, PLANS, RETURN_FEE_CENTS, type OrderStatus, type Plan } from "@/lib/types";

export type FormState = { error?: string; success?: string; values?: Record<string, string> } | undefined;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** React vacía el formulario tras la acción: devolvemos lo escrito (sin secretos) para no perderlo si hay error. */
const keep = (form: FormData, fields: string[]) => Object.fromEntries(fields.map((f) => [f, str(form.get(f))]));

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** "4,80" o "4.80" → 480 céntimos. */
function cents(value: string): number | null {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

// ─── Clientes ───────────────────────────────────────────────

export async function createClient(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const name = str(form.get("name"));
  const plan = (str(form.get("plan")) || "ARRANQUE") as Plan;
  const values = keep(form, ["name", "contactEmail", "plan"]);
  if (!name) return { error: "El nombre es obligatorio", values };
  if (!(plan in PLANS)) return { error: "Plan no válido", values };
  const p = PLANS[plan];
  await db.client.create({
    data: {
      name,
      contactEmail: str(form.get("contactEmail")) || null,
      plan,
      planOrders: p.orders,
      monthlyFeeCents: p.feeCents,
      extraOrderFeeCents: p.extraCents,
      returnFeeCents: RETURN_FEE_CENTS,
    },
  });
  revalidatePath("/clientes");
  return { success: `Cliente «${name}» creado` };
}

export async function updateClient(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const fields = ["name", "contactEmail", "taxId", "billingAddress", "plan", "planOrders", "monthlyFee", "extraOrderFee", "returnFee"];
  const values = keep(form, fields);
  const planOrders = Number(values.planOrders);
  const monthlyFeeCents = cents(values.monthlyFee);
  const extraOrderFeeCents = cents(values.extraOrderFee);
  const returnFeeCents = cents(values.returnFee);
  if (!values.name) return { error: "El nombre es obligatorio", values };
  if (!(values.plan in PLANS)) return { error: "Plan no válido", values };
  if (!Number.isInteger(planOrders) || planOrders < 0) return { error: "Pedidos incluidos no válidos", values };
  if (monthlyFeeCents === null || extraOrderFeeCents === null || returnFeeCents === null) return { error: "Revisa los importes", values };

  await db.client.update({
    where: { id: clientId },
    data: {
      name: values.name,
      contactEmail: values.contactEmail || null,
      taxId: values.taxId || null,
      billingAddress: values.billingAddress || null,
      plan: values.plan,
      planOrders,
      monthlyFeeCents,
      extraOrderFeeCents,
      returnFeeCents,
    },
  });
  revalidatePath("/", "layout");
  return { success: "Cliente actualizado", values };
}

// ─── Tiendas ────────────────────────────────────────────────

export async function connectStore(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
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

  const plain = {
    platform,
    domain,
    accessToken: str(form.get("accessToken")) || null,
    consumerKey: str(form.get("consumerKey")) || null,
    consumerSecret: str(form.get("consumerSecret")) || null,
  };
  try {
    await testStoreConnection(plain);
  } catch (err) {
    return { error: `No hemos podido conectar: ${message(err)}`, values };
  }

  const exists = await db.store.findUnique({ where: { platform_domain: { platform, domain } } });
  if (exists) return { error: "Esa tienda ya está conectada", values };

  // Shopify: la clave de firma de webhooks. WooCommerce: la generamos nosotros.
  const webhookSecret = str(form.get("webhookSecret")) || (platform === "WOOCOMMERCE" ? crypto.randomBytes(24).toString("hex") : null);
  const store = await db.store.create({
    data: {
      clientId,
      platform,
      name,
      domain,
      accessToken: encrypt(plain.accessToken),
      consumerKey: encrypt(plain.consumerKey),
      consumerSecret: encrypt(plain.consumerSecret),
      webhookSecret: encrypt(webhookSecret),
    },
  });
  try {
    await syncStore(store.id);
  } catch {
    // El error queda guardado en la tienda y se muestra en su ficha.
  }
  revalidatePath("/", "layout");
  redirect(`/tiendas/${store.id}`);
}

export async function syncStoreAction(storeId: string): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  try {
    const r = await syncStore(storeId);
    revalidatePath("/", "layout");
    return { success: `${r.orders} pedidos nuevos · ${r.products} productos actualizados` };
  } catch (err) {
    revalidatePath("/", "layout");
    return { error: message(err) };
  }
}

// ─── Salida ─────────────────────────────────────────────────

export async function advanceOrder(orderId: string) {
  await assertRole(["ADMIN", "STAFF"]);
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const i = ORDER_FLOW.indexOf(order.status as OrderStatus);
  const next = ORDER_FLOW[i + 1];
  // El paso a "Enviado" exige etiqueta o seguimiento.
  if (i < 0 || !next || next === "SHIPPED") return;
  await db.order.update({ where: { id: orderId }, data: { status: next } });
  revalidatePath("/", "layout");
}

/** Avanza en bloque los pedidos seleccionados un paso (Pendiente → Preparando → Embalado). */
export async function advanceOrders(form: FormData) {
  await assertRole(["ADMIN", "STAFF"]);
  const ids = form.getAll("ids").map(String);
  const orders = await db.order.findMany({ where: { id: { in: ids }, status: { in: ["PENDING", "PICKING"] } } });
  for (const o of orders) {
    await db.order.update({ where: { id: o.id }, data: { status: o.status === "PENDING" ? "PICKING" : "PACKED" } });
  }
  revalidatePath("/", "layout");
}

/** Crea la etiqueta (Packia o Sendcloud), marca el pedido como enviado y avisa a la tienda. */
export async function labelAndShip(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const values = keep(form, ["method", "weight"]);
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, client: true } });
  if (order.status === "SHIPPED") return { error: "El pedido ya está enviado" };

  const weightGrams = Number(values.weight) || (await estimateWeight(order));
  if (weightGrams <= 0 || weightGrams > 70000) return { error: "Peso no válido", values };

  // method: "packia:MRW" | "sendcloud:1234"
  const [kind, ref] = values.method.split(":");
  let req: LabelRequest;
  if (kind === "sendcloud" && Number(ref)) req = { provider: "SENDCLOUD", shippingMethodId: Number(ref), weightGrams };
  else if (kind === "packia" && (CARRIERS as readonly string[]).includes(ref)) req = { provider: "PACKIA", carrier: ref, weightGrams };
  else return { error: "Elige cómo enviar", values };

  try {
    const shipment = await createLabel(order, req);
    await shipOrder(order.id, shipment);
  } catch (err) {
    return { error: `No se pudo crear la etiqueta: ${message(err)}`, values };
  }
  revalidatePath("/", "layout");
  const updated = await db.order.findUnique({ where: { id: orderId } });
  if (updated?.syncError) return { error: `Etiqueta creada, pero no se pudo avisar a la tienda: ${updated.syncError}` };
  return { success: "Etiqueta creada y seguimiento enviado a la tienda" };
}

/** Envío con etiqueta hecha fuera de Packia: solo se registra el seguimiento. */
export async function shipOrderAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const carrier = str(form.get("carrier"));
  const trackingNumber = str(form.get("trackingNumber"));
  if (!carrier || !trackingNumber) return { error: "Agencia y número de seguimiento son obligatorios", values: keep(form, ["carrier", "trackingNumber"]) };
  await shipOrder(orderId, { carrier, trackingNumber, labelProvider: "MANUAL" });
  const order = await db.order.findUnique({ where: { id: orderId } });
  revalidatePath("/", "layout");
  if (order?.syncError) return { error: `Enviado, pero no se pudo avisar a la tienda: ${order.syncError}` };
  return { success: "Pedido enviado y seguimiento enviado a la tienda" };
}

// ─── Inventario ─────────────────────────────────────────────

export async function updateProduct(productId: string, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const stock = Number(str(form.get("stock")));
  const lowStockAt = Number(str(form.get("lowStockAt")));
  const weightRaw = str(form.get("weightGrams"));
  const weightGrams = weightRaw ? Number(weightRaw) : null;
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock no válido" };
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0) return { error: "Umbral no válido" };
  if (weightGrams !== null && (!Number.isInteger(weightGrams) || weightGrams < 0)) return { error: "Peso no válido" };
  await db.product.update({
    where: { id: productId },
    data: { stock, lowStockAt, weightGrams, location: str(form.get("location")).toUpperCase() || null },
  });
  revalidatePath("/inventario");
  return { success: "Guardado" };
}

// ─── Usuarios ───────────────────────────────────────────────

export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const values = keep(form, ["email", "name", "role", "clientId"]);
  const email = values.email.toLowerCase();
  const password = str(form.get("password"));
  if (!email || !password) return { error: "Email y contraseña son obligatorios", values };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres", values };
  if (!["ADMIN", "STAFF", "CLIENT"].includes(values.role)) return { error: "Rol no válido", values };
  if (values.role === "CLIENT" && !values.clientId) return { error: "Un usuario cliente necesita una empresa", values };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: values.name } });
  if (error || !data.user) return { error: `Supabase: ${error?.message ?? "no se pudo crear el usuario"}`, values };

  await db.profile.create({
    data: {
      id: data.user.id,
      email,
      name: values.name || null,
      role: values.role,
      clientId: values.role === "CLIENT" ? values.clientId : null,
    },
  });
  revalidatePath("/usuarios");
  return { success: `Usuario ${email} creado. Comparte la contraseña temporal por un canal seguro.` };
}

export async function deleteUser(profileId: string) {
  const me = await assertRole(["ADMIN"]);
  if (me.id === profileId) throw new Error("No puedes borrar tu propio usuario");
  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error && !/not found/i.test(error.message)) throw new Error(error.message);
  await db.profile.delete({ where: { id: profileId } });
  revalidatePath("/usuarios");
}

