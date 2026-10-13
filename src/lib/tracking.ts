import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { token } from "@/lib/onboarding";
import { sendMail } from "@/lib/mailer";
import { getAppUrl } from "@/lib/app-url";

/**
 * A2 · Seguimiento con la marca de cada tienda.
 * Página pública /seguimiento/TOKEN y emails al comprador con el logo y el color del cliente.
 */

export const BUYER_EVENTS = ["RECEIVED", "PACKED", "SHIPPED", "DELIVERED"] as const;
export type BuyerEvent = (typeof BUYER_EVENTS)[number];
export const EVENT_LABEL: Record<BuyerEvent, string> = { RECEIVED: "Pedido recibido", PACKED: "Preparado", SHIPPED: "En camino", DELIVERED: "Entregado" };

export const parseEvents = (s: string | null | undefined) =>
  new Set((s ?? "").split(",").map((x) => x.trim()).filter((x): x is BuyerEvent => (BUYER_EVENTS as readonly string[]).includes(x)));

export const isHexColor = (c: string | null | undefined): c is string => Boolean(c && /^#[0-9a-fA-F]{6}$/.test(c));
export const safeColor = (c: string | null | undefined) => (isHexColor(c) ? c : "#0B0B0D");
/** Negro o blanco, lo que mejor se lea sobre el color. */
export function textOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#0B0B0D" : "#FFFFFF";
}

/** Etapa actual (0 recibido … 3 entregado). */
export function stageOf(o: { status: string; deliveredAt?: Date | null }) {
  if (o.deliveredAt) return 3;
  if (o.status === "SHIPPED") return 2;
  if (o.status === "PACKED") return 1;
  return 0;
}

export const validTrackingToken = (t: string | null | undefined): t is string => Boolean(t && /^[\w-]{20,64}$/.test(t));

/** URL pública de la app, también fuera de una petición (programador). */
export async function publicAppUrl(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  try {
    return await getAppUrl();
  } catch {
    return null;
  }
}

export async function ensureTrackingToken(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { trackingToken: true } });
  if (o.trackingToken) return o.trackingToken;
  const t = token(18);
  await db.order.updateMany({ where: { id: orderId, trackingToken: null }, data: { trackingToken: t } });
  return (await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { trackingToken: true } })).trackingToken!;
}

export async function trackingPageUrl(orderId: string) {
  const app = await publicAppUrl();
  return app ? `${app}/seguimiento/${await ensureTrackingToken(orderId)}` : null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type EmailCtx = {
  brandName: string;
  color: string;
  logoUrl?: string | null;
  orderNumber: string;
  firstName?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  pageUrl?: string | null;
  message?: string | null;
  items: { name: string; quantity: number }[];
};

const COPY: Record<BuyerEvent, (c: EmailCtx) => { subject: string; title: string; body: string }> = {
  RECEIVED: (c) => ({ subject: `Hemos recibido tu pedido ${c.orderNumber}`, title: "¡Pedido recibido!", body: "Ya está en nuestro almacén. Lo preparamos enseguida y te avisamos cuando salga." }),
  PACKED: (c) => ({ subject: `Tu pedido ${c.orderNumber} está preparado`, title: "Pedido preparado", body: "Lo hemos revisado y embalado con cuidado. Sale hoy o el próximo día laborable." }),
  SHIPPED: (c) => ({ subject: `Tu pedido ${c.orderNumber} va de camino`, title: "¡Tu pedido va de camino!", body: `Ha salido${c.carrier ? ` con ${c.carrier}` : ""}${c.trackingNumber ? ` (seguimiento ${c.trackingNumber})` : ""}.` }),
  DELIVERED: (c) => ({ subject: `Tu pedido ${c.orderNumber} se ha entregado`, title: "Pedido entregado", body: "¡Esperamos que lo disfrutes! Si algo no está bien, responde a este email." }),
};

/** Email con la marca de la tienda (HTML sencillo compatible con Gmail/Outlook). */
export function buyerEmail(event: BuyerEvent, c: EmailCtx) {
  const copy = COPY[event](c);
  const fg = textOn(c.color);
  const hello = c.firstName ? `Hola ${esc(c.firstName)},` : "Hola,";
  const items = c.items.slice(0, 8).map((i) => `<tr><td style="padding:4px 0;color:#374151">${i.quantity}×</td><td style="padding:4px 8px;color:#111827">${esc(i.name)}</td></tr>`).join("");
  const button = c.pageUrl
    ? `<p style="margin:24px 0"><a href="${esc(c.pageUrl)}" style="background:${c.color};color:${fg};padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Ver el estado de mi pedido</a></p>`
    : "";
  const header = c.logoUrl
    ? `<img src="${esc(c.logoUrl)}" alt="${esc(c.brandName)}" style="max-height:48px;max-width:200px">`
    : `<span style="font-size:22px;font-weight:800;color:${fg}">${esc(c.brandName)}</span>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${c.color};padding:22px 28px">${header}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;color:#111827">${esc(copy.title)}</h1>
<p style="margin:0 0 8px;color:#374151">${hello}</p>
<p style="margin:0;color:#374151">${esc(copy.body)}</p>
${button}
<p style="margin:16px 0 4px;font-size:13px;color:#6b7280">Pedido ${esc(c.orderNumber)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${items}</table>
${c.message ? `<p style="margin:20px 0 0;padding:14px;border-radius:10px;background:#f9fafb;color:#374151">${esc(c.message)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #f0f0f0;font-size:12px;color:#9ca3af">${esc(c.brandName)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [copy.title, "", hello, copy.body, c.pageUrl ? `\nSigue tu pedido: ${c.pageUrl}` : "", `\nPedido ${c.orderNumber}`, ...c.items.map((i) => `${i.quantity}× ${i.name}`), c.message ? `\n${c.message}` : ""].join("\n");
  return { subject: copy.subject, html, text };
}

/** Contexto del email para un pedido (marca del cliente). */
async function contextFor(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { client: true, items: { select: { name: true, quantity: true } } } });
  const app = await publicAppUrl();
  const t = app ? await ensureTrackingToken(o.id) : null;
  const ctx: EmailCtx = {
    brandName: o.client.publicName || o.client.name,
    color: safeColor(o.client.publicColor),
    logoUrl: app && t && o.client.publicLogo ? `${app}/seguimiento/${t}/logo` : null,
    orderNumber: o.number,
    firstName: o.customerName.split(/\s+/)[0] || undefined,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    pageUrl: app && t ? `${app}/seguimiento/${t}` : null,
    message: o.client.publicMessage,
    items: o.items,
  };
  return { order: o, ctx };
}

/**
 * Avisa al comprador de un cambio de estado (una sola vez por pedido y evento).
 * Solo si el cliente tiene el seguimiento activo, avisamos nosotros (notifyBuyer = KARGIA) y el evento está elegido.
 */
export async function notifyBuyer(orderId: string, event: BuyerEvent): Promise<"off" | "dup" | "sent" | "skipped" | "failed"> {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { email: true, client: { select: { trackingEnabled: true, notifyBuyer: true, buyerEvents: true } } } });
  if (!o || !o.client.trackingEnabled || o.client.notifyBuyer !== "KARGIA" || !parseEvents(o.client.buyerEvents).has(event)) return "off";
  if (!o.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return "off";
  let logId: string;
  try {
    logId = (await db.messageLog.create({ data: { orderId, event, to: o.email, status: "PENDING" } })).id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "dup";
    throw err;
  }
  try {
    const { order, ctx } = await contextFor(orderId);
    const mail = buyerEmail(event, ctx);
    const r = await sendMail({ to: o.email, ...mail, fromName: ctx.brandName, replyTo: order.client.publicReplyTo });
    await db.messageLog.update({ where: { id: logId }, data: { status: r.skipped ? "SKIPPED" : "SENT", error: r.skipped ? "SMTP sin configurar" : null } });
    return r.skipped ? "skipped" : "sent";
  } catch (err) {
    await db.messageLog.update({ where: { id: logId }, data: { status: "FAILED", error: (err instanceof Error ? err.message : String(err)).slice(0, 300) } });
    return "failed";
  }
}

/** Igual que notifyBuyer pero sin esperar ni romper el flujo del almacén. */
export function notifyBuyerLater(orderId: string, event: BuyerEvent) {
  notifyBuyer(orderId, event).catch((err) => console.error(`notifyBuyer ${event}:`, err));
}

/** Email de prueba con un pedido de ejemplo, para ver cómo queda. */
export async function sendTestBuyerEmail(clientId: string, to: string) {
  const c = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const ctx: EmailCtx = {
    brandName: c.publicName || c.name,
    color: safeColor(c.publicColor),
    logoUrl: null,
    orderNumber: "#1001",
    firstName: "Laura",
    carrier: "GLS",
    trackingNumber: "PK123456789ES",
    pageUrl: null,
    message: c.publicMessage,
    items: [{ name: "Producto de ejemplo", quantity: 2 }],
  };
  const mail = buyerEmail("SHIPPED", ctx);
  return sendMail({ to, ...mail, subject: `[Prueba] ${mail.subject}`, fromName: ctx.brandName, replyTo: c.publicReplyTo });
}
