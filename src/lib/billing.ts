import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { addDays, dayKey, monthKey, monthRange, shiftMonth, startOfDay } from "@/lib/schedule";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { PLANS, type Plan } from "@/lib/types";

export const TAX_RATE = 21;

export type Line = { description: string; quantity: number; unitPriceCents: number; amountCents: number };

export type BillingStatus = "NOT_STARTED" | "TRIAL" | "PRORATED" | "FULL";

export type Usage = {
  client: Client;
  status: BillingStatus;
  /** Desde cuándo se cobra (fin de la prueba). */
  billableFrom: Date;
  /** Parte del mes que se cobra (1 = mes completo). */
  fraction: number;
  shippedOrders: number;
  includedOrders: number;
  extraOrders: number;
  processedReturns: number;
  lines: Line[];
  subtotalCents: number;
};

const DAY = 86_400_000;

/** Fin de la prueba = alta + semanas de prueba (a las 00:00 de Madrid). */
export function billableFrom(client: Pick<Client, "serviceStartAt" | "createdAt" | "trialWeeks">) {
  return addDays(startOfDay(client.serviceStartAt ?? client.createdAt), client.trialWeeks * 7);
}

/**
 * Consumo de un cliente en un mes "AAAA-MM": cuota + pedidos de exceso + devoluciones procesadas.
 * Durante la prueba no se cobra nada. El mes en que empieza a pagar se prorratea por días
 * (cuota y pedidos incluidos) y solo cuentan los pedidos y devoluciones desde ese día.
 */
export async function usageFor(client: Client, month: string): Promise<Usage> {
  const { start, end } = monthRange(month);
  const serviceStart = startOfDay(client.serviceStartAt ?? client.createdAt);
  const from = billableFrom(client);
  const base = { client, billableFrom: from, shippedOrders: 0, includedOrders: 0, extraOrders: 0, processedReturns: 0 };

  if (serviceStart >= end) return { ...base, status: "NOT_STARTED", fraction: 0, lines: [], subtotalCents: 0 };

  const trialStart = serviceStart;
  const trialLine = (until: Date): Line => ({
    description: `Periodo de prueba gratis (${client.trialWeeks} ${client.trialWeeks === 1 ? "semana" : "semanas"}: del ${formatDateOnly(trialStart)} al ${formatDateOnly(new Date(until.getTime() - DAY))})`,
    quantity: 1,
    unitPriceCents: 0,
    amountCents: 0,
  });

  if (from >= end) return { ...base, status: "TRIAL", fraction: 0, lines: [trialLine(end)], subtotalCents: 0 };

  const periodStart = from > start ? from : start;
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / DAY);
  const days = Math.round((end.getTime() - periodStart.getTime()) / DAY);
  const fraction = Math.min(1, days / daysInMonth);
  const prorated = fraction < 1;

  const [shippedOrders, processedReturns] = await Promise.all([
    db.order.count({ where: { clientId: client.id, status: "SHIPPED", shippedAt: { gte: periodStart, lt: end } } }),
    db.return.count({ where: { clientId: client.id, status: "PROCESSED", processedAt: { gte: periodStart, lt: end } } }),
  ]);
  const includedOrders = Math.round(client.planOrders * fraction);
  const feeCents = Math.round(client.monthlyFeeCents * fraction);
  const extraOrders = Math.max(0, shippedOrders - includedOrders);
  const planLabel = PLANS[client.plan as Plan]?.label ?? client.plan;

  const lines: Line[] = [];
  if (prorated && client.trialWeeks > 0 && from > start) lines.push(trialLine(from));
  lines.push({
    description: prorated
      ? `Cuota plan ${planLabel}, prorrateada ${days}/${daysInMonth} días desde el ${formatDateOnly(periodStart)} (incluye ${includedOrders} pedidos)`
      : `Cuota plan ${planLabel} (incluye ${client.planOrders} pedidos)`,
    quantity: 1,
    unitPriceCents: feeCents,
    amountCents: feeCents,
  });
  if (extraOrders) {
    lines.push({ description: "Pedidos adicionales al plan", quantity: extraOrders, unitPriceCents: client.extraOrderFeeCents, amountCents: extraOrders * client.extraOrderFeeCents });
  }
  if (processedReturns) {
    lines.push({ description: "Devoluciones procesadas", quantity: processedReturns, unitPriceCents: client.returnFeeCents, amountCents: processedReturns * client.returnFeeCents });
  }
  return {
    ...base,
    status: prorated ? "PRORATED" : "FULL",
    fraction,
    shippedOrders,
    includedOrders,
    extraOrders,
    processedReturns,
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
  };
}

/** Emite la factura de un mes cerrado. Numeración correlativa por año: PK-2026-0001. */
export async function issueInvoice(clientId: string, month: string) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const { start, end } = monthRange(month);
  const usage = await usageFor(client, month);
  if (usage.subtotalCents <= 0) throw new Error(usage.status === "TRIAL" ? "Está en periodo de prueba: no hay nada que facturar" : "No hay nada que facturar ese mes");
  const taxCents = Math.round((usage.subtotalCents * TAX_RATE) / 100);
  const year = month.slice(0, 4);

  return db.$transaction(async (tx) => {
    const exists = await tx.invoice.findUnique({ where: { clientId_periodStart: { clientId, periodStart: start } } });
    if (exists) throw new Error("Ya existe la factura de ese mes");
    const count = await tx.invoice.count({ where: { number: { startsWith: `PK-${year}-` } } });
    return tx.invoice.create({
      data: {
        number: `PK-${year}-${String(count + 1).padStart(4, "0")}`,
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

/** Datos fiscales de Packia para la factura. */
export async function issuer() {
  return (await getSettings()).company;
}

/** Emite las facturas que falten de un mes cerrado (se salta las de importe 0: prueba o sin alta). */
export async function issueAllInvoices(month: string, now = new Date()) {
  if (month >= monthKey(now)) throw new Error("Solo se facturan meses cerrados");
  const { start } = monthRange(month);
  const clients = await db.client.findMany({ where: { invoices: { none: { periodStart: start } } } });
  const issued: { id: string; number: string; clientId: string; totalCents: number }[] = [];
  let skipped = 0;
  for (const client of clients) {
    const usage = await usageFor(client, month);
    if (usage.subtotalCents <= 0) {
      skipped++;
      continue;
    }
    const inv = await issueInvoice(client.id, month);
    issued.push({ id: inv.id, number: inv.number, clientId: client.id, totalCents: inv.totalCents });
    await notify({ title: `Factura ${inv.number} emitida`, body: `${formatMonth(start)} · total ${eur(inv.totalCents)}`, href: `/facturacion/${inv.id}`, clientId: client.id, tone: "info", audience: "ALL" });
  }
  return { issued, skipped };
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
