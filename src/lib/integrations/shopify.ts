import crypto from "node:crypto";
import type { ExternalOrder, ExternalProduct, Shipment } from "@/lib/types";

type ShopifyCreds = { domain: string; accessToken: string };

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2026-10";

/** fetch con un mensaje entendible si la tienda no existe o no responde. */
async function shopFetch(domain: string, url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(`No se encuentra la tienda ${domain}. Revisa el dominio .myshopify.com (Shopify → Configuración → Dominios).`);
  }
}

async function gql<T>(creds: ShopifyCreds, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await shopFetch(creds.domain, `https://${creds.domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify respondió ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopify: ${json.errors.map((e) => e.message).join("; ")}`);
  return json.data as T;
}

type GqlAddress = {
  name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  province: string | null;
  country: string | null;
  countryCodeV2: string | null;
  phone: string | null;
} | null;

function toAddress(a: GqlAddress) {
  return {
    name: a?.name ?? "",
    address1: a?.address1 ?? "",
    address2: a?.address2 ?? undefined,
    city: a?.city ?? "",
    zip: a?.zip ?? "",
    province: a?.province ?? undefined,
    country: a?.country ?? "",
    countryCode: a?.countryCodeV2 ?? undefined,
    phone: a?.phone ?? undefined,
  };
}

/**
 * Apps del Dev Dashboard (2026+): no hay token fijo. Se pide uno con
 * Client ID + Client secret (client credentials grant) y dura 24 h.
 * Solo funciona si la app está instalada en la tienda y ambas son de la misma organización
 * (el comerciante crea la app desde su propio admin).
 */
export async function clientCredentialsToken(domain: string, clientId: string, clientSecret: string) {
  const res = await shopFetch(domain, `https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }).toString(),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    if (/shop_not_permitted/.test(text)) throw new Error("Shopify no permite el acceso: la app debe crearla el dueño de la tienda desde su propio admin e instalarla en esa tienda");
    if (/application_cannot_be_found|invalid_client/.test(text)) throw new Error("Client ID o Client secret incorrectos, o la app no está instalada en la tienda");
    throw new Error(`Shopify respondió ${res.status} al pedir el token: ${text.slice(0, 200)}`);
  }
  const data = JSON.parse(text) as { access_token: string; expires_in?: number };
  return { accessToken: data.access_token, expiresAt: new Date(Date.now() + (data.expires_in ?? 86399) * 1000) };
}

const WEBHOOK_TOPICS = ["ORDERS_CREATE", "ORDERS_CANCELLED"] as const;

/** Da de alta los webhooks de pedidos apuntando a Packia. Ignora los que ya existen. */
export async function registerWebhooks(creds: ShopifyCreds, callbackUrl: string) {
  // Desde la API 2025-10 la dirección del webhook es el campo `uri` (antes `callbackUrl`).
  const existing = await gql<{ webhookSubscriptions: { nodes: { topic: string; uri: string }[] } }>(
    creds,
    `{ webhookSubscriptions(first: 50) { nodes { topic uri } } }`,
  );
  const has = (topic: string) => existing.webhookSubscriptions.nodes.some((n) => n.topic === topic && n.uri === callbackUrl);
  const created: string[] = [];
  for (const topic of WEBHOOK_TOPICS) {
    if (has(topic)) continue;
    const r = await gql<{ webhookSubscriptionCreate: { userErrors: { message: string }[] } }>(
      creds,
      `mutation Create($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { webhookSubscription { id } userErrors { message } }
      }`,
      { topic, sub: { uri: callbackUrl, format: "JSON" } },
    );
    const errors = r.webhookSubscriptionCreate.userErrors.filter((e) => !/already been taken/i.test(e.message));
    if (errors.length) throw new Error(`Webhook ${topic}: ${errors.map((e) => e.message).join("; ")}`);
    created.push(topic);
  }
  return created;
}

export async function testConnection(creds: ShopifyCreds): Promise<string> {
  const data = await gql<{ shop: { name: string } }>(creds, `{ shop { name } }`);
  return data.shop.name;
}

/** Pedidos abiertos pendientes de preparar. */
export async function fetchOpenOrders(creds: ShopifyCreds): Promise<ExternalOrder[]> {
  const data = await gql<{
    orders: {
      nodes: {
        id: string;
        name: string;
        createdAt: string;
        email: string | null;
        shippingAddress: GqlAddress;
        lineItems: { nodes: { id: string; sku: string | null; name: string; quantity: number }[] };
      }[];
    };
  }>(
    creds,
    `query OpenOrders {
      orders(first: 100, sortKey: CREATED_AT, reverse: true, query: "status:open fulfillment_status:unfulfilled") {
        nodes {
          id name createdAt email
          shippingAddress { name address1 address2 city zip province country countryCodeV2 phone }
          lineItems(first: 100) { nodes { id sku name quantity } }
        }
      }
    }`,
  );

  return data.orders.nodes.map((o) => ({
    externalId: o.id.split("/").pop()!,
    number: o.name,
    placedAt: new Date(o.createdAt),
    customerName: o.shippingAddress?.name ?? "Sin nombre",
    email: o.email ?? undefined,
    shippingAddress: toAddress(o.shippingAddress),
    items: o.lineItems.nodes.map((li) => ({
      externalLineId: li.id.split("/").pop(),
      sku: li.sku || li.id.split("/").pop()!,
      name: li.name,
      quantity: li.quantity,
    })),
  }));
}

export async function fetchProducts(creds: ShopifyCreds): Promise<ExternalProduct[]> {
  const data = await gql<{
    productVariants: { nodes: { id: string; sku: string | null; displayName: string }[] };
  }>(
    creds,
    `query Variants {
      productVariants(first: 250) {
        nodes { id sku displayName }
      }
    }`,
  );
  return data.productVariants.nodes
    .filter((v) => v.sku)
    .map((v) => ({ externalId: v.id.split("/").pop()!, sku: v.sku!, name: v.displayName }));
}

/** Marca el pedido como preparado en Shopify con su número de seguimiento. */
export async function fulfillOrder(creds: ShopifyCreds, externalOrderId: string, shipment: Shipment) {
  const data = await gql<{
    order: { fulfillmentOrders: { nodes: { id: string; status: string }[] } } | null;
  }>(
    creds,
    `query FulfillmentOrders($id: ID!) {
      order(id: $id) { fulfillmentOrders(first: 10) { nodes { id status } } }
    }`,
    { id: `gid://shopify/Order/${externalOrderId}` },
  );

  const open = data.order?.fulfillmentOrders.nodes.filter((fo) => fo.status === "OPEN" || fo.status === "IN_PROGRESS") ?? [];
  if (!open.length) throw new Error("El pedido no tiene órdenes de preparación abiertas en Shopify");

  const result = await gql<{
    fulfillmentCreate: { userErrors: { field: string[] | null; message: string }[] };
  }>(
    creds,
    `mutation Fulfill($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) { fulfillment { id } userErrors { field message } }
    }`,
    {
      fulfillment: {
        notifyCustomer: shipment.notifyCustomer ?? true,
        trackingInfo: { company: shipment.carrier, number: shipment.trackingNumber, url: shipment.trackingUrl },
        lineItemsByFulfillmentOrder: open.map((fo) => ({ fulfillmentOrderId: fo.id })),
      },
    },
  );
  const errors = result.fulfillmentCreate.userErrors;
  if (errors.length) throw new Error(`Shopify: ${errors.map((e) => e.message).join("; ")}`);
}

/** Verifica la cabecera X-Shopify-Hmac-Sha256 con el secreto de la app. */
export function verifyWebhook(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type RestAddress = {
  first_name?: string; last_name?: string; name?: string; address1?: string; address2?: string;
  city?: string; zip?: string; province?: string; country?: string; country_code?: string; phone?: string;
} | null;

/** Convierte el payload REST de los webhooks orders/* al formato común. */
export function orderFromWebhook(p: {
  id: number;
  name: string;
  created_at: string;
  email?: string;
  cancelled_at?: string | null;
  shipping_address?: RestAddress;
  line_items: { id: number; sku: string | null; name: string; quantity: number }[];
}): ExternalOrder {
  const a = p.shipping_address;
  const name = a?.name ?? [a?.first_name, a?.last_name].filter(Boolean).join(" ");
  return {
    externalId: String(p.id),
    number: p.name,
    placedAt: new Date(p.created_at),
    customerName: name || "Sin nombre",
    email: p.email,
    cancelled: Boolean(p.cancelled_at),
    shippingAddress: {
      name,
      address1: a?.address1 ?? "",
      address2: a?.address2 || undefined,
      city: a?.city ?? "",
      zip: a?.zip ?? "",
      province: a?.province || undefined,
      country: a?.country ?? "",
      countryCode: a?.country_code || undefined,
      phone: a?.phone || undefined,
    },
    items: p.line_items.map((li) => ({
      externalLineId: String(li.id),
      sku: li.sku || String(li.id),
      name: li.name,
      quantity: li.quantity,
    })),
  };
}
