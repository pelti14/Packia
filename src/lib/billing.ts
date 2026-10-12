import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { monthRange } from "@/lib/schedule";
import { PLANS, type Plan } from "@/lib/types";

export const TAX_RATE = 21;

export type Line = { description: string; quantity: number; unitPriceCents: number; amountCents: number };

export type Usage = {
  client: Client;
  shippedOrders: number;
  includedOrders: number;
  extraOrders: number;
  processedReturns: number;
  lines: Line[];
  subtotalCents: number;
};

/** Consumo de un cliente en un mes "AAAA-MM": cuota + pedidos de exceso + devoluciones procesadas. */
export async function usageFor(client: Client, month: string): Promise<Usage> {
  const { start, end } = monthRange(month);
  const [shippedOrders, processedReturns] = await Promise.all([
    db.order.count({ where: { clientId: client.id, status: "SHIPPED", shippedAt: { gte: start, lt: end } } }),
    db.return.count({ where: { clientId: client.id, status: "PROCESSED", processedAt: { gte: start, lt: end } } }),
  ]);
  const extraOrders = Math.max(0, shippedOrders - client.planOrders);
  const planLabel = PLANS[client.plan as Plan]?.label ?? client.plan;

  const lines: Line[] = [
    { description: `Cuota plan ${planLabel} (incluye ${client.planOrders} pedidos)`, quantity: 1, unitPriceCents: client.monthlyFeeCents, amountCents: client.monthlyFeeCents },
  ];
  if (extraOrders) {
    lines.push({ description: "Pedidos adicionales al plan", quantity: extraOrders, unitPriceCents: client.extraOrderFeeCents, amountCents: extraOrders * client.extraOrderFeeCents });
  }
  if (processedReturns) {
    lines.push({ description: "Devoluciones procesadas", quantity: processedReturns, unitPriceCents: client.returnFeeCents, amountCents: processedReturns * client.returnFeeCents });
  }
  return {
    client,
    shippedOrders,
    includedOrders: client.planOrders,
    extraOrders,
    processedReturns,
    lines,
    subtotalCents: lines.reduce((s, l) => s + l.amountCents, 0),
  };
}

/** Emite la factura de un mes cerrado. Numeración correlativa por año: PK-2026-0001. */
export async function issueInvoice(clientId: string, month: string) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const { start, end } = monthRange(month);
  const usage = await usageFor(client, month);
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
