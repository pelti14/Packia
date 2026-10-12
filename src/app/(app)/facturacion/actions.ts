"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { issueInvoice } from "@/lib/billing";
import { notify } from "@/lib/notifications";
import { eur } from "@/lib/format";
import { monthKey } from "@/lib/schedule";

export async function issueInvoiceAction(clientId: string, month: string) {
  await assertRole(["ADMIN"]);
  if (month >= monthKey()) throw new Error("Solo se facturan meses cerrados");
  const invoice = await issueInvoice(clientId, month);
  await notify({ title: `Factura ${invoice.number} emitida`, body: `Total ${eur(invoice.totalCents)}`, href: `/facturacion/${invoice.id}`, clientId, tone: "info", audience: "ALL" });
  revalidatePath("/facturacion");
}

export async function setInvoicePaid(invoiceId: string, paid: boolean) {
  await assertRole(["ADMIN"]);
  await db.invoice.update({ where: { id: invoiceId }, data: { status: paid ? "PAID" : "ISSUED", paidAt: paid ? new Date() : null } });
  revalidatePath("/facturacion", "layout");
}
