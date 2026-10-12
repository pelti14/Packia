import type { Client, PlanRequest } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, monthKey, monthRange, shiftMonth, startOfDay } from "@/lib/schedule";
import { formatDateOnly } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { PLANS } from "@/lib/types";

/** Condiciones de un plan: lo que se copia al cliente. */
export type Terms = { plan: string; orders: number; feeCents: number; extraCents: number };
export type PlanOption = Terms & { label: string };

/** Planes editables en Ajustes. Si la tabla aún no existe (versión sin actualizar), los de serie. */
export async function getPlans(): Promise<PlanOption[]> {
  const rows = await db.planConfig.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }).catch(() => []);
  if (rows.length) return rows.map((r) => ({ plan: r.key, label: r.label, orders: r.orders, feeCents: r.feeCents, extraCents: r.extraCents }));
  return Object.entries(PLANS).map(([plan, p]) => ({ plan, label: p.label, orders: p.orders, feeCents: p.feeCents, extraCents: p.extraCents }));
}

export async function planLabel(plan: string) {
  return (await getPlans()).find((p) => p.plan === plan)?.label ?? PLANS[plan as keyof typeof PLANS]?.label ?? plan;
}

export const clientTerms = (c: Pick<Client, "plan" | "planOrders" | "monthlyFeeCents" | "extraOrderFeeCents">): Terms => ({
  plan: c.plan,
  orders: c.planOrders,
  feeCents: c.monthlyFeeCents,
  extraCents: c.extraOrderFeeCents,
});

export const sameTerms = (a: Terms, b: Terms) => a.plan === b.plan && a.orders === b.orders && a.feeCents === b.feeCents && a.extraCents === b.extraCents;

/**
 * Cambia las condiciones de un cliente desde `effectiveAt` (00:00) y lo deja en el historial,
 * para que la factura de ese mes reparta cuota y pedidos incluidos por días.
 */
export async function changeTerms(clientId: string, to: Terms, effectiveAt: Date, source: "ADMIN" | "CLIENT" | "SETTINGS", createdBy?: string) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const from = clientTerms(client);
  if (sameTerms(from, to)) return false;
  await db.$transaction([
    db.planChange.create({
      data: {
        clientId,
        effectiveAt: startOfDay(effectiveAt),
        fromPlan: from.plan, fromOrders: from.orders, fromFeeCents: from.feeCents, fromExtraCents: from.extraCents,
        toPlan: to.plan, toOrders: to.orders, toFeeCents: to.feeCents, toExtraCents: to.extraCents,
        source,
        createdBy,
      },
    }),
    db.client.update({ where: { id: clientId }, data: { plan: to.plan, planOrders: to.orders, monthlyFeeCents: to.feeCents, extraOrderFeeCents: to.extraCents } }),
  ]);
  return true;
}

/** Tramos de condiciones dentro de [start, end): cada uno con su plan. */
export async function termsTimeline(client: Client, start: Date, end: Date) {
  const changes = await db.planChange.findMany({ where: { clientId: client.id, effectiveAt: { gt: start } }, orderBy: [{ effectiveAt: "asc" }, { createdAt: "asc" }] }).catch(() => []);
  let terms: Terms = changes[0]
    ? { plan: changes[0].fromPlan, orders: changes[0].fromOrders, feeCents: changes[0].fromFeeCents, extraCents: changes[0].fromExtraCents }
    : clientTerms(client);
  let cursor = start;
  const segments: { start: Date; end: Date; terms: Terms }[] = [];
  for (const c of changes) {
    if (c.effectiveAt >= end) break;
    if (c.effectiveAt > cursor) segments.push({ start: cursor, end: c.effectiveAt, terms });
    cursor = c.effectiveAt > cursor ? c.effectiveAt : cursor;
    terms = { plan: c.toPlan, orders: c.toOrders, feeCents: c.toFeeCents, extraCents: c.toExtraCents };
  }
  if (cursor < end) segments.push({ start: cursor, end, terms });
  return segments;
}

/** Primer día del mes que viene. */
export const nextMonthStart = (now = new Date()) => monthRange(shiftMonth(monthKey(now), 1)).start;
/** Último día del mes en curso. */
export const monthLastDay = (now = new Date()) => addDays(nextMonthStart(now), -1);

/** Aplica los cambios programados que ya han llegado a su fecha (bajadas de plan y cambios del administrador). */
export async function applyDuePlanRequests(now = new Date()) {
  const due = await db.planRequest
    .findMany({ where: { status: "PENDING", type: { in: ["DOWNGRADE", "CHANGE"] }, effectiveAt: { lte: now } }, orderBy: { effectiveAt: "asc" } })
    .catch(() => [] as PlanRequest[]);
  for (const r of due) {
    const terms = await requestTerms(r);
    if (terms) await changeTerms(r.clientId, terms, r.effectiveAt, r.type === "CHANGE" ? "ADMIN" : "CLIENT", r.createdBy ?? undefined);
    await db.planRequest.update({ where: { id: r.id }, data: { status: "APPLIED", resolvedAt: new Date(), resolvedBy: "Automático" } });
    const label = terms ? await planLabel(terms.plan) : r.plan;
    await notify({ title: `Plan cambiado a ${label}`, body: `Desde el ${formatDateOnly(r.effectiveAt)}`, href: `/mi-plan?c=${r.clientId}`, clientId: r.clientId, tone: "info", audience: "ALL" });
  }
  return due.length;
}

async function requestTerms(r: PlanRequest): Promise<Terms | null> {
  if (r.type === "CHANGE" && r.plan && r.orders != null && r.feeCents != null && r.extraCents != null) {
    return { plan: r.plan, orders: r.orders, feeCents: r.feeCents, extraCents: r.extraCents };
  }
  const p = (await getPlans()).find((x) => x.plan === r.plan);
  return p ? { plan: p.plan, orders: p.orders, feeCents: p.feeCents, extraCents: p.extraCents } : null;
}

/**
 * Pedidos incluidos en el mes contando los cambios de plan por días
 * (300 hasta el 15 y 600 desde el 16 → unos 455). Sin descontar la prueba.
 */
export async function monthlyIncluded(client: Client, month = monthKey()) {
  const { start, end } = monthRange(month);
  const total = (end.getTime() - start.getTime()) / 86_400_000;
  const segments = await termsTimeline(client, start, end);
  return Math.round(segments.reduce((n, s) => n + (s.terms.orders * (s.end.getTime() - s.start.getTime())) / 86_400_000 / total, 0));
}

/** Último día por defecto para una baja: fin de este mes (o del siguiente si quedan menos de 7 días). */
export function defaultLastDay(now = new Date()) {
  const end = monthLastDay(now);
  return end.getTime() - now.getTime() < 7 * 86_400_000 ? monthLastDay(addDays(end, 2)) : end;
}
