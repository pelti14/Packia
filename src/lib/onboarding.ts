import crypto from "node:crypto";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getBrand } from "@/lib/brand";
import * as woo from "@/lib/integrations/woocommerce";

/**
 * A1 · Alta autoservicio y conexión en un clic.
 * - Invitaciones con enlace (o alta abierta si se activa en Ajustes).
 * - Shopify: OAuth (app propia con SHOPIFY_API_KEY / SHOPIFY_API_SECRET).
 * - WooCommerce: wc-auth (la tienda nos envía sus claves al aprobar; nadie copia nada).
 */

const STATE_TTL_MS = 30 * 60_000;
export const token = (bytes = 24) => crypto.randomBytes(bytes).toString("base64url");

// ─── Invitaciones ───────────────────────────────────────────

export async function createInvite(input: { email?: string; companyName?: string; plan?: string; trialWeeks?: number; createdBy?: string; days?: number }) {
  return db.invite.create({
    data: {
      token: token(),
      email: input.email?.toLowerCase() || null,
      companyName: input.companyName || null,
      plan: input.plan || null,
      trialWeeks: input.trialWeeks ?? null,
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + (input.days ?? 14) * 86_400_000),
    },
  });
}

/** Invitación válida (no usada ni caducada) o null. */
export async function findInvite(t: string | null | undefined) {
  if (!t || !/^[\w-]{20,64}$/.test(t)) return null;
  const inv = await db.invite.findUnique({ where: { token: t } });
  return inv && !inv.usedAt && inv.expiresAt > new Date() ? inv : null;
}

export async function signupOpen() {
  const s = await db.appSettings.findUnique({ where: { id: "default" }, select: { openSignup: true, defaultTrialWeeks: true } }).catch(() => null);
  return { open: s?.openSignup ?? false, trialWeeks: s?.defaultTrialWeeks ?? 2 };
}

// ─── Estado de la conexión (anti-CSRF) ──────────────────────

export async function createOAuthState(kind: "SHOPIFY" | "WOOCOMMERCE", clientId: string, domain: string) {
  const id = token();
  await db.oAuthState.create({ data: { id, kind, clientId, domain } });
  return id;
}

/** Consume un estado: válido una sola vez y durante 30 minutos. */
export async function consumeOAuthState(id: string | null | undefined, kind: "SHOPIFY" | "WOOCOMMERCE") {
  if (!id || !/^[\w-]{20,64}$/.test(id)) return null;
  const s = await db.oAuthState.findUnique({ where: { id } });
  if (!s || s.kind !== kind || s.usedAt || Date.now() - s.createdAt.getTime() > STATE_TTL_MS) return null;
  const r = await db.oAuthState.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count ? s : null;
}

// ─── Shopify OAuth ──────────────────────────────────────────

export const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ??
  "read_orders,write_orders,read_products,read_customers,read_merchant_managed_fulfillment_orders,write_merchant_managed_fulfillment_orders,read_assigned_fulfillment_orders,write_assigned_fulfillment_orders";

export function shopifyOAuthConfigured() {
  return Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
}

/** «mitienda», «mitienda.myshopify.com» o la URL del admin → «mitienda.myshopify.com», o null. */
export function normalizeShop(input: string): string | null {
  let s = input.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0];
  const admin = input.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
  if (admin) s = admin[1].toLowerCase();
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]{0,60}\.myshopify\.com$/.test(s) ? s : null;
}

export function shopifyAuthorizeUrl(shop: string, state: string, appUrl: string) {
  const q = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY ?? "",
    scope: SHOPIFY_SCOPES,
    redirect_uri: `${appUrl}/api/shopify/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${q}`;
}

/** Firma HMAC de la vuelta de Shopify: hex de HMAC-SHA256 de los parámetros ordenados (sin «hmac»). */
export function verifyShopifyQuery(params: URLSearchParams, secret: string) {
  const hmac = params.get("hmac");
  if (!hmac || !/^[a-f0-9]{64}$/i.test(hmac)) return false;
  // Igual que la librería oficial: parámetros ordenados y codificados como en una URL.
  const message = new URLSearchParams(
    [...params.entries()].filter(([k]) => k !== "hmac" && k !== "signature").sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ).toString();
  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(hmac.toLowerCase(), "utf8"));
}

/** Cambia el código por el token permanente de la tienda. */
export async function exchangeShopifyCode(shop: string, code: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, code }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify respondió ${res.status} al pedir el token`);
  const data = (await res.json()) as { access_token?: string; scope?: string };
  if (!data.access_token) throw new Error("Shopify no ha devuelto el token");
  return data.access_token;
}

/** Guarda (o actualiza) la tienda Shopify conectada por OAuth. Nunca la mueve de un cliente a otro. */
export async function saveShopifyStore(clientId: string, shop: string, accessToken: string) {
  const existing = await db.store.findUnique({ where: { platform_domain: { platform: "SHOPIFY", domain: shop } } });
  if (existing && existing.clientId !== clientId) throw new Error("Esta tienda ya está conectada a otra cuenta. Escríbenos y lo revisamos.");
  const data = { accessToken: encrypt(accessToken), webhookSecret: encrypt(process.env.SHOPIFY_API_SECRET ?? ""), shopifyClientId: null, shopifyClientSecret: null, tokenExpiresAt: null, lastSyncError: null };
  return existing
    ? db.store.update({ where: { id: existing.id }, data })
    : db.store.create({ data: { clientId, platform: "SHOPIFY", name: shop.replace(".myshopify.com", ""), domain: shop, ...data } });
}

// ─── WooCommerce wc-auth ────────────────────────────────────

export function normalizeWooUrl(input: string): string | null {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export async function wooAuthorizeUrl(storeUrl: string, state: string, appUrl: string) {
  const q = new URLSearchParams({
    app_name: (await getBrand()).name,
    scope: "read_write",
    user_id: state,
    return_url: `${appUrl}/bienvenida?woo=1`,
    callback_url: `${appUrl}/api/woocommerce/callback`,
  });
  return `${storeUrl}/wc-auth/v1/authorize?${q}`;
}

export type WooKeys = { key_id?: number; user_id?: string; consumer_key?: string; consumer_secret?: string; key_permissions?: string };

/** WooCommerce nos envía las claves al aprobar: se guardan cifradas y se crean los webhooks. */
export async function saveWooStore(state: { clientId: string; domain: string }, keys: WooKeys, appUrl: string) {
  if (!keys.consumer_key?.startsWith("ck_") || !keys.consumer_secret?.startsWith("cs_")) throw new Error("Claves de WooCommerce no válidas");
  if (keys.key_permissions && keys.key_permissions !== "read_write") throw new Error("Hacen falta permisos de lectura y escritura");
  const existing = await db.store.findUnique({ where: { platform_domain: { platform: "WOOCOMMERCE", domain: state.domain } } });
  if (existing && existing.clientId !== state.clientId) throw new Error("Esta tienda ya está conectada a otra cuenta");
  const secret = crypto.randomBytes(24).toString("hex");
  const data = { consumerKey: encrypt(keys.consumer_key), consumerSecret: encrypt(keys.consumer_secret), webhookSecret: encrypt(secret), lastSyncError: null };
  const store = existing
    ? await db.store.update({ where: { id: existing.id }, data })
    : await db.store.create({ data: { clientId: state.clientId, platform: "WOOCOMMERCE", name: new URL(state.domain).hostname, domain: state.domain, ...data } });
  try {
    await woo.registerWebhooks({ domain: state.domain, consumerKey: keys.consumer_key, consumerSecret: keys.consumer_secret }, `${appUrl}/api/webhooks/woocommerce`, secret);
  } catch (err) {
    await db.store.update({ where: { id: store.id }, data: { lastSyncError: `No se pudieron crear los webhooks: ${err instanceof Error ? err.message : String(err)}` } });
  }
  return store;
}
