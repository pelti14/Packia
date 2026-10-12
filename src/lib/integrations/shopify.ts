import crypto from "node:crypto";
import type { ExternalOrder, ExternalProduct, Shipment } from "@/lib/types";

type ShopifyCreds = { domain: string; accessToken: string };

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-07";

async function gql<T>(creds: ShopifyCreds, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${creds.domain}/admin/api/${API_VERSION}/graphql.json`, {
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
    phone: a?.phone ?? undefined,
  };
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
          shippingAddress { name address1 address2 city zip province country phone }
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
    productVariants: {
      nodes: { id: string; sku: string | null; displayName: string; image: { url: string } | null; product: { featuredImage: { url: string } | null } }[];
    };
  }>(
    creds,
    `query Variants {
      productVariants(first: 250) {
        nodes { id sku displayName image { url } product { featuredImage { url } } }
      }
    }`,
  );
  return data.productVariants.nodes
    .filter((v) => v.sku)
    .map((v) => ({
      externalId: v.id.split("/").pop()!,
      sku: v.sku!,
      name: v.displayName,
      imageUrl: v.image?.url ?? v.product.featuredImage?.url ?? undefined,
    }));
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
        notifyCustomer: true,
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
  city?: string; zip?: string; province?: string; country?: string; phone?: string;
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
