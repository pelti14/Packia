import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { addDays, dayKey, monthKey, monthRange, shiftMonth, startOfDay } from "@/lib/schedule";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { applyDuePlanRequests, getPlans, termsTimeline } from "@/lib/plans";

export const TAX_RATE = 21;

export type Line = { description: string; quantity: number; unitPriceCents: number; amountCents: number };

export type BillingStatus = "NOT_STARTED" | "TRIAL" | "PRORATED" | "FULL" | "ENDED";

export type Usage = {
  client: Client;
  status: BillingStatus;
  /** Periodo pedido [start, end). */
  start: Date;
  end: Date;
  /** Desde cuándo se cobra (fin de la prueba). */
  billableFrom: Date;
  /** Parte del mes que se cobra (1 = mes completo con el mismo plan o no). */
  fraction: number;
  shippedOrders: number;
  includedOrders: number;
  extraOrders: number;
  processedReturns: number;
  lines: Line[];
  subtotalCents: number;
};

const DAY = 86_400_000;
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
/** Día anterior a una fecha exclusiva, para mostrar «del 1 al 14». */
const lastDay = (exclusiveEnd: Date) => new Date(exclusiveEnd.getTime() - DAY);

/** Fin de la prueba = alta + semanas de prueba (a las 00:00 de Madrid). */
export function billableFrom(client: Pick<Client, "serviceStartAt" | "createdAt" | "trialWeeks">) {
  return addDays(startOfDay(client.serviceStartAt ?? client.createdAt), client.trialWeeks * 7);
}

/** Primer instante sin servicio (día siguiente al último día), o null si sigue activo. */
export function serviceEnd(client: Pick<Client, "serviceEndAt">) {
  return client.serviceEndAt ? addDays(startOfDay(client.serviceEndAt), 1) : null;
}

/**
 * Consumo de un cliente entre `start` y `end` (dentro de un mismo mes): cuota + pedidos de exceso
 * + devoluciones procesadas. Durante la prueba y después de la baja no se cobra nada.
 * La cuota y los pedidos incluidos se reparten por días entre los planes que haya tenido:
 * si sube de plan el día 16, la segunda quincena cuenta con la cuota y los pedidos del plan nuevo.
 */
export async function usageForRange(client: Client, start: Date, end: Date): Promise<Usage> {
  const month = monthKey(start);
  const { start: mStart, end: mEnd } = monthRange(month);
  const daysInMonth = days(mStart, mEnd);
  const serviceStart = startOfDay(client.serviceStartAt ?? client.createdAt);
  const from = billableFrom(client);
  const stop = serviceEnd(client);
  const base = { client, start, end, billableFrom: from, fraction: 0, shippedOrders: 0, includedOrders: 0, extraOrders: 0, processedReturns: 0, lines: [] as Line[], subtotalCents: 0 };

  if (serviceStart >= end) return { ...base, status: "NOT_STARTED" };
  if (stop && stop <= start) return { ...base, status: "ENDED" };

  const trialLine = (until: Date): Line => ({
    description: `Periodo de prueba gratis (${client.trialWeeks} ${client.trialWeeks === 1 ? "semana" : "semanas"}: del ${formatDateOnly(serviceStart)} al ${formatDateOnly(lastDay(until))})`,
    quantity: 1,
    unitPriceCents: 0,
    amountCents: 0,
  });
  if (from >= end) return { ...base, status: "TRIAL", lines: [trialLine(from)] };

  const periodStart = from > start ? from : start;
  const periodEnd = stop && stop < end ? stop : end;

  const [segments, shippedOrders, processedReturns, plans, transport] = await Promise.all([
    termsTimeline(client, periodStart, periodEnd),
    db.order.count({ where: { clientId: client.id, status: "SHIPPED", shippedAt: { gte: periodStart, lt: periodEnd } } }),
    db.return.count({ where: { clientId: client.id, status: "PROCESSED", processedAt: { gte: periodStart, lt: periodEnd } } }),
    getPlans(),
    // Transporte: lo que se cobra por cada envío (coste de la agencia + margen), agrupado por agencia.
    db.order.groupBy({
      by: ["carrier"],
      where: { clientId: client.id, status: "SHIPPED", shippedAt: { gte: periodStart, lt: periodEnd }, shippingChargeCents: { not: null } },
      _sum: { shippingChargeCents: true },
      _count: true,
    }),
  ]);
  const label = (plan: string) => plans.find((p) => p.plan === plan)?.label ?? plan;

  const lines: Line[] = [];
  if (client.trialWeeks > 0 && from > start && from <= end) lines.push(trialLine(from));
  let included = 0;
  for (const s of segments) {
    const d = days(s.start, s.end);
    const full = d >= daysInMonth;
    const fee = Math.round((s.terms.feeCents * d) / daysInMonth);
    const inc = (s.terms.orders * d) / daysInMonth;
    included += inc;
    lines.push({
      description: full
        ? `Cuota plan ${label(s.terms.plan)} (incluye ${s.terms.orders} pedidos)`
        : `Cuota plan ${label(s.terms.plan)} del ${formatDateOnly(s.start)} al ${formatDateOnly(lastDay(s.end))}: ${d}/${daysInMonth} días (incluye ${Math.round(inc)} de ${s.terms.orders} pedidos)`,
      quantity: 1,
      unitPriceCents: fee,
      amountCents: fee,
    });
  }
  const includedOrders = Math.round(included);
  const extraOrders = Math.max(0, shippedOrders - includedOrders);
  // El exceso se cobra al precio del plan vigente al final del periodo.
  const extraCents = segments.at(-1)?.terms.extraCents ?? client.extraOrderFeeCents;
  if (extraOrders) lines.push({ description: `Pedidos adicionales (enviados ${shippedOrders}, incluidos ${includedOrders})`, quantity: extraOrders, unitPriceCents: extraCents, amountCents: extraOrders * extraCents });
  for (const t of transport) {
    const sum = t._sum.shippingChargeCents ?? 0;
    if (sum > 0) lines.push({ description: `Transporte ${t.carrier ?? ""} (${t._count} ${t._count === 1 ? "envío" : "envíos"})`.replace("  ", " "), quantity: 1, unitPriceCents: sum, amountCents: sum });
  }
  if (processedReturns) lines.push({ description: "Devoluciones procesadas", quantity: processedReturns, unitPriceCents: client.returnFeeCents, amountCents: processedReturns * client.returnFeeCents });

  const fraction = Math.min(1, days(periodStart, periodEnd) / daysInMonth);
  return {
    ...base,
    status: fraction < 1 ? "PRORATED" : "FULL",
    fraction,
    shippedOrders,
    includedOrders,
    extraOrders,
    processedReturns,
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
  };
}

/** Consumo del mes "AAAA-MM" completo. */
export function usageFor(client: Client, month: string) {
  const { start, end } = monthRange(month);
  return usageForRange(client, start, end);
}

/** Hasta dónde está facturado un cliente dentro del mes (inicio del mes si nada). */
export async function invoicedUntil(clientId: string, month: string) {
  const { start, end } = monthRange(month);
  const last = await db.invoice.findFirst({ where: { clientId, ...LIVE, periodStart: { gte: start, lt: end } }, orderBy: { periodEnd: "desc" }, select: { periodEnd: true } });
  return last && last.periodEnd > start ? last.periodEnd : start;
}

/** Lo que falta por facturar de un mes hasta `until` (exclusivo; por defecto el fin del mes). */
export async function pendingUsage(client: Client, month: string, until?: Date) {
  const { end } = monthRange(month);
  const from = await invoicedUntil(client.id, month);
  const to = until && until < end ? until : end;
  if (from >= to) return null;
  return usageForRange(client, from, to);
}

/**
 * Emite una factura de [start, end) dentro de un mismo mes. Numeración correlativa por año: PK-2026-0001.
 * No se puede solapar con otra factura del cliente.
 */
export async function issueInvoice(clientId: string, start: Date, end: Date) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  if (monthKey(start) !== monthKey(lastDay(end))) throw new Error("Una factura no puede abarcar dos meses");
  const usage = await usageForRange(client, start, end);
  if (usage.subtotalCents <= 0) {
    throw new Error(usage.status === "TRIAL" ? "Está en periodo de prueba: no hay nada que facturar" : usage.status === "ENDED" ? "El servicio ya había terminado" : "No hay nada que facturar en ese periodo");
  }
  const taxCents = Math.round((usage.subtotalCents * TAX_RATE) / 100);
  const prefix = await invoicePrefix();

  return db.$transaction(async (tx) => {
    const overlap = await tx.invoice.findFirst({ where: { clientId, ...LIVE, periodStart: { lt: end }, periodEnd: { gt: start } } });
    if (overlap) throw new Error(`Ese periodo ya está en la factura ${overlap.number}`);
    return tx.invoice.create({
      data: {
        number: await nextNumber(tx, prefix),
        clientId,
        periodStart: start,
        periodEnd: end,
        subtotalCents: usage.subtotalCents,
        taxRate: TAX_RATE,
        taxCents,
        totalCents: usage.subtotalCents + taxCents,
        lines: { create: usage.lines },
      },
    });
  });
}

/**
 * Factura lo pendiente de un cliente hasta el día `untilDay` incluido (por defecto hoy).
 * Sirve para facturar a mitad de mes (una baja, un acuerdo…). Al cerrar el mes se cobra solo el resto.
 */
export async function issueInvoiceUntil(clientId: string, untilDay = new Date()) {
  await applyDuePlanRequests();
  const month = monthKey(untilDay);
  const end = addDays(startOfDay(untilDay), 1);
  const prev = shiftMonth(month, -1);
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  // El mes anterior tiene que estar cerrado antes (si tenía algo que facturar).
  const prevPending = await pendingUsage(client, prev);
  if (prevPending && prevPending.subtotalCents > 0) throw new Error(`Primero emite la factura de ${formatMonth(monthRange(prev).start)}`);
  const from = await invoicedUntil(clientId, month);
  if (from >= end) throw new Error(`Ya está facturado hasta el ${formatDateOnly(lastDay(from))}`);
  return issueInvoice(clientId, from, end);
}

/** Factura lo que falte de un mes cerrado (después de facturas parciales, solo el resto). */
export async function issueMonthInvoice(clientId: string, month: string) {
  await applyDuePlanRequests();
  const from = await invoicedUntil(clientId, month);
  const { end } = monthRange(month);
  if (from >= end) throw new Error("Ese mes ya está facturado entero");
  return issueInvoice(clientId, from, end);
}

/** Facturas que cuentan: normales y no anuladas (las rectificativas y las anuladas no ocupan periodo). */
const LIVE = { kind: "INVOICE", status: { not: "CANCELLED" } } as const;

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function invoicePrefix() {
  const s = await db.appSettings.findUnique({ where: { id: "default" }, select: { invoicePrefix: true } }).catch(() => null);
  return (s?.invoicePrefix || "KG").toUpperCase();
}

/** Siguiente número correlativo de la serie en el año: KG-2026-0007 (o KGR-… para rectificativas). */
async function nextNumber(tx: Tx, series: string, now = new Date()) {
  const head = `${series}-${dayKey(now).slice(0, 4)}-`;
  const rows = await tx.invoice.findMany({ where: { number: { startsWith: head } }, select: { number: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.number.slice(head.length)) || 0), 0);
  return `${head}${String(max + 1).padStart(4, "0")}`;
}

export type EditLine = { description: string; quantity: number; unitPriceCents: number };

/** Crea la rectificativa (importes en negativo) que anula una factura, dentro de una transacción. */
async function createCorrective(tx: Tx, id: string, reason: string, prefix: string) {
  const inv = await tx.invoice.findUnique({ where: { id }, include: { lines: true } });
  if (!inv) throw new Error("Factura no encontrada");
  if (inv.kind !== "INVOICE") throw new Error("Una rectificativa no se puede anular; emite otra factura si hace falta");
  if (inv.status === "CANCELLED") throw new Error("Esta factura ya está anulada");
  const corrective = await tx.invoice.create({
    data: {
      number: await nextNumber(tx, `${prefix}R`),
      kind: "CORRECTIVE",
      clientId: inv.clientId,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      subtotalCents: -inv.subtotalCents,
      taxRate: inv.taxRate,
      taxCents: -inv.taxCents,
      totalCents: -inv.totalCents,
      reason,
      correctsId: inv.id,
      lines: { create: inv.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPriceCents: -l.unitPriceCents, amountCents: -l.amountCents })) },
    },
  });
  await tx.invoice.update({ where: { id: inv.id }, data: { status: "CANCELLED", cancelledAt: new Date(), reason } });
  return { inv, corrective };
}

/**
 * Anula una factura emitida. Una factura no se borra ni se edita: se emite una rectificativa
 * en negativo (serie R) que la deja a cero, y el periodo queda libre para volver a facturarlo.
 */
export async function cancelInvoice(id: string, reason: string) {
  if (!reason.trim()) throw new Error("Indica el motivo de la anulación");
  const prefix = await invoicePrefix();
  return db.$transaction((tx) => createCorrective(tx, id, reason.trim(), prefix));
}

/**
 * Corrige una factura: la anula con su rectificativa y emite una nueva con las líneas corregidas,
 * mismo cliente y periodo, enlazada a la original.
 */
export async function rectifyInvoice(id: string, lines: EditLine[], reason: string, taxRate?: number) {
  if (!reason.trim()) throw new Error("Indica el motivo de la corrección");
  const clean = lines
    .map((l) => ({ description: l.description.trim().slice(0, 300), quantity: Math.round(l.quantity), unitPriceCents: Math.round(l.unitPriceCents) }))
    .filter((l) => l.description && l.quantity !== 0);
  if (!clean.length) throw new Error("La factura corregida necesita al menos una línea. Para dejarla a cero, usa «Anular».");
  const prefix = await invoicePrefix();
  return db.$transaction(async (tx) => {
    const { inv, corrective } = await createCorrective(tx, id, reason.trim(), prefix);
    const rate = taxRate ?? inv.taxRate;
    const subtotal = clean.reduce((n, l) => n + l.quantity * l.unitPriceCents, 0);
    const tax = Math.round((subtotal * rate) / 100);
    const replacement = await tx.invoice.create({
      data: {
        number: await nextNumber(tx, prefix),
        clientId: inv.clientId,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        subtotalCents: subtotal,
        taxRate: rate,
        taxCents: tax,
        totalCents: subtotal + tax,
        reason: reason.trim(),
        replacesId: inv.id,
        lines: { create: clean.map((l) => ({ ...l, amountCents: l.quantity * l.unitPriceCents })) },
      },
    });
    return { inv, corrective, replacement };
  });
}

/** Datos fiscales de la empresa para la factura. */
export async function issuer() {
  return (await getSettings()).company;
}

/** Emite las facturas que falten de un mes cerrado (se salta las de importe 0: prueba, sin alta o de baja). */
export async function issueAllInvoices(month: string, now = new Date()) {
  if (month >= monthKey(now)) throw new Error("Solo se facturan meses cerrados");
  await applyDuePlanRequests(now);
  const { start } = monthRange(month);
  const clients = await db.client.findMany();
  const issued: { id: string; number: string; clientId: string; totalCents: number }[] = [];
  let skipped = 0;
  for (const client of clients) {
    const usage = await pendingUsage(client, month);
    if (!usage || usage.subtotalCents <= 0) {
      skipped++;
      continue;
    }
    const inv = await issueInvoice(client.id, usage.start, usage.end);
    issued.push({ id: inv.id, number: inv.number, clientId: client.id, totalCents: inv.totalCents });
    await notify({ title: `Factura ${inv.number} emitida`, body: `${formatMonth(start)} · total ${eur(inv.totalCents)}`, href: `/facturacion/${inv.id}`, clientId: client.id, tone: "info", audience: "ALL" });
  }
  return { issued, skipped };
}

/** Texto del periodo de una factura: «Octubre de 2026» o «1 oct – 12 oct 2026». */
export function invoicePeriodLabel(i: { periodStart: Date; periodEnd: Date }) {
  const { start, end } = monthRange(monthKey(i.periodStart));
  if (i.periodStart.getTime() === start.getTime() && i.periodEnd.getTime() === end.getTime()) return formatMonth(i.periodStart);
  return `${formatDateOnly(i.periodStart)} – ${formatDateOnly(lastDay(i.periodEnd))}`;
}

/**
 * Facturación automática: del día 1 al 5 de cada mes emite las facturas del mes anterior
 * (una sola vez, con una marca en la base de datos). Se puede desactivar en Ajustes.
 */
export async function maybeAutoInvoice(now = new Date()) {
  const settings = await db.appSettings.findUnique({ where: { id: "default" }, select: { autoInvoice: true } });
  if (settings && !settings.autoInvoice) return null;
  if (Number(dayKey(now).slice(8, 10)) > 5) return null;
  const month = shiftMonth(monthKey(now), -1);
  const flag = `auto-invoices-${month}`;
  try {
    await db.syncLock.create({ data: { id: flag, lockedUntil: new Date(0) } });
  } catch {
    return null; // ya se hizo (o se está haciendo) este mes
  }
  try {
    const r = await issueAllInvoices(month, now);
    await db.syncLock.update({ where: { id: flag }, data: { lastRunAt: new Date() } });
    if (r.issued.length) {
      const total = r.issued.reduce((n, i) => n + i.totalCents, 0);
      await notify({ title: `Facturas de ${formatMonth(monthRange(month).start)} emitidas`, body: `${r.issued.length} facturas · ${eur(total)} con IVA`, href: `/facturacion?month=${month}`, tone: "success" });
    }
    return r;
  } catch (err) {
    await db.syncLock.delete({ where: { id: flag } }).catch(() => {});
    throw err;
  }
}
