"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { issueAllInvoices, issueInvoiceUntil, issueMonthInvoice } from "@/lib/billing";
import { notify } from "@/lib/notifications";
import { eur } from "@/lib/format";
import { monthKey } from "@/lib/schedule";

type Invoice = { id: string; number: string; totalCents: number };

async function announce(clientId: string, invoice: Invoice) {
  await notify({ title: `Factura ${invoice.number} emitida`, body: `Total ${eur(invoice.totalCents)}`, href: `/facturacion/${invoice.id}`, clientId, tone: "info", audience: "ALL" });
}

/** Los errores vuelven a la página como aviso en lugar de romperla. */
async function run(back: string, fn: () => Promise<Invoice | void>) {
  let target = back;
  try {
    const inv = await fn();
    if (inv) target = `/facturacion/${inv.id}`;
  } catch (err) {
    const sep = back.includes("?") ? "&" : "?";
    target = `${back}${sep}error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`;
  }
  revalidatePath("/", "layout");
  redirect(target);
}

/** Factura lo que falte de un mes cerrado. */
export async function issueInvoiceAction(clientId: string, month: string) {
  await assertRole(["ADMIN"]);
  await run(`/facturacion?month=${month}`, async () => {
    if (month >= monthKey()) throw new Error("El mes aún no ha terminado: usa «Facturar hasta hoy»");
    const inv = await issueMonthInvoice(clientId, month);
    await announce(clientId, inv);
    return inv;
  });
}

/** Factura lo pendiente hasta hoy incluido (o hasta el día indicado del mes en curso). */
export async function issueUntilAction(clientId: string, back: string, form?: FormData) {
  await assertRole(["ADMIN"]);
  await run(back, async () => {
    const day = typeof form?.get("until") === "string" ? String(form.get("until")) : "";
    const until = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : new Date();
    if (until.getTime() > Date.now() + 86_400_000 * 62) throw new Error("Elige una fecha más cercana");
    const inv = await issueInvoiceUntil(clientId, until);
    await announce(clientId, inv);
    return inv;
  });
}

export async function setInvoicePaid(invoiceId: string, paid: boolean) {
  await assertRole(["ADMIN"]);
  await db.invoice.update({ where: { id: invoiceId }, data: { status: paid ? "PAID" : "ISSUED", paidAt: paid ? new Date() : null } });
  revalidatePath("/facturacion", "layout");
}

export async function issueAllAction(month: string) {
  await assertRole(["ADMIN"]);
  await run(`/facturacion?month=${month}`, async () => {
    await issueAllInvoices(month);
  });
}
