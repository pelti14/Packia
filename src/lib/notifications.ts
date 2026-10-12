import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientScope, type CurrentUser } from "@/lib/auth";
import { startOfDay, urgency } from "@/lib/schedule";

export type Tone = "info" | "success" | "warning" | "danger";

/** Crea un aviso. audience "ALL" = también lo ve el cliente afectado. */
export async function notify(n: { title: string; body?: string; href?: string; clientId?: string | null; tone?: Tone; audience?: "STAFF" | "ALL" }) {
  try {
    await db.notification.create({
      data: { title: n.title, body: n.body, href: n.href, clientId: n.clientId ?? null, tone: n.tone ?? "info", audience: n.audience ?? "STAFF" },
    });
  } catch (err) {
    // Un aviso nunca debe romper la operación que lo genera.
    console.error("notify:", err);
  }
}

/** Qué avisos puede ver cada usuario. */
function visibleTo(user: CurrentUser): Prisma.NotificationWhereInput {
  if (user.role === "CLIENT") return { audience: "ALL", clientId: user.clientId ?? "__none__" };
  return {};
}

export async function listNotifications(user: CurrentUser, take = 30) {
  const where = visibleTo(user);
  const seen = (await db.profile.findUnique({ where: { id: user.id }, select: { notificationsSeenAt: true } }))?.notificationsSeenAt ?? new Date(0);
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take }),
    db.notification.count({ where: { ...where, createdAt: { gt: seen } } }),
  ]);
  return { items: items.map((i) => ({ ...i, unread: i.createdAt > seen })), unread };
}

export async function markNotificationsSeen(user: CurrentUser) {
  await db.profile.update({ where: { id: user.id }, data: { notificationsSeenAt: new Date() } });
}

export type Badge = { count: number; tone: "green" | "red" } | null;
export type Badges = Record<"salida" | "recepcion" | "devoluciones" | "tiendas" | "inventario" | "etiquetas", Badge>;

/**
 * Numeritos del menú. Rojo = urgente (retrasos, errores); verde = tareas normales pendientes.
 */
export async function getBadges(user: CurrentUser): Promise<Badges> {
  const scope = clientScope(user);
  const today = startOfDay();
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  const [open, inbound, inboundLate, returns, returnsLate, storeErrors, toValidate, toPrint] = await Promise.all([
    db.order.findMany({ where: { ...scope, status: { in: ["PENDING", "PICKING", "PACKED"] } }, select: { placedAt: true, clientId: true, items: { select: { sku: true } } } }),
    db.inbound.count({ where: { ...scope, status: "EXPECTED" } }),
    db.inbound.count({ where: { ...scope, status: "EXPECTED", expectedAt: { lt: today } } }),
    db.return.count({ where: { ...scope, status: { in: ["ANNOUNCED", "RECEIVED"] } } }),
    db.return.count({ where: { ...scope, status: "RECEIVED", receivedAt: { lt: threeDaysAgo } } }),
    user.role === "CLIENT" ? Promise.resolve(0) : db.store.count({ where: { lastSyncError: { not: null } } }),
    user.role === "CLIENT" ? Promise.resolve([]) : db.product.findMany({ where: { validatedAt: null }, select: { clientId: true, sku: true } }),
    user.role === "CLIENT" ? Promise.resolve(0) : db.order.count({ where: { status: "SHIPPED", labelProvider: { in: ["PACKIA", "SENDCLOUD"] }, labelPrintedAt: null } }),
  ]);
  // Rojo si algún pedido abierto está bloqueado por un producto sin validar.
  const pendingKeys = new Set(toValidate.map((p) => `${p.clientId}|${p.sku}`));
  const blocking = open.some((o) => o.items.some((i) => pendingKeys.has(`${o.clientId}|${i.sku}`)));
  const due = open.filter((o) => urgency(o.placedAt) !== "LATER");
  const overdue = due.filter((o) => urgency(o.placedAt) === "OVERDUE").length;
  const badge = (count: number, red: boolean): Badge => (count > 0 ? { count, tone: red ? "red" : "green" } : null);
  return {
    salida: badge(due.length, overdue > 0),
    recepcion: badge(inbound, inboundLate > 0),
    devoluciones: badge(returns, returnsLate > 0),
    tiendas: badge(storeErrors, true),
    inventario: badge(toValidate.length, blocking),
    etiquetas: badge(toPrint, false),
  };
}
