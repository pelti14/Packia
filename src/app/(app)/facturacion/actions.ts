"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { cancelInvoice, issueAllInvoices, issueInvoiceUntil, issueMonthInvoice, rectifyInvoice } from "@/lib/billing";
import { notify } from "@/lib/notifications";
import { eur } from "@/lib/format";
import { monthKey } from "@/lib/schedule";
import { safeRedirectPath } from "@/lib/security";

type Invoice = { id: string; number: string; totalCents: number };

async function announce(clientId: string, invoice: Invoice) {
  await notify({ title: `Factura ${invoice.number} emitida`, body: `Total ${eur(invoice.totalCents)}`, href: `/facturacion/${invoice.id}`, clientId, tone: "info", audience: "ALL" });
}

/** Los errores vuelven a la página como aviso en lugar de romperla. */
async function run(rawBack: string, fn: () => Promise<Invoice | void>) {
  const back = safeRedirectPath(rawBack, "/facturacion");
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
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, select: { kind: true, status: true } });
  if (!inv || inv.kind !== "INVOICE" || inv.status === "CANCELLED") return;
  await db.invoice.update({ where: { id: invoiceId }, data: { status: paid ? "PAID" : "ISSUED", paidAt: paid ? new Date() : null } });
  revalidatePath("/facturacion", "layout");
}

export async function issueAllAction(month: string) {
  await assertRole(["ADMIN"]);
  await run(`/facturacion?month=${month}`, async () => {
    await issueAllInvoices(month);
  });
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Anular una factura: rectificativa en negativo y el periodo queda libre. */
export async function cancelInvoiceAction(invoiceId: string, form: FormData) {
  await assertRole(["ADMIN"]);
  await run(`/facturacion/${invoiceId}`, async () => {
    const { inv, corrective } = await cancelInvoice(invoiceId, str(form.get("reason")));
    await notify({ title: `Factura ${inv.number} anulada`, body: `Rectificativa ${corrective.number} · ${str(form.get("reason"))}`, href: `/facturacion/${corrective.id}`, clientId: inv.clientId, tone: "warning", audience: "ALL" });
    return corrective;
  });
}

/** Corregir una factura: rectificativa + factura nueva con las líneas editadas. */
export async function rectifyInvoiceAction(invoiceId: string, form: FormData) {
  await assertRole(["ADMIN"]);
  await run(`/facturacion/${invoiceId}/rectificar`, async () => {
    const descriptions = form.getAll("description").map(String);
    const quantities = form.getAll("quantity").map((v) => Number(String(v).replace(",", ".")));
    const prices = form.getAll("unitPrice").map((v) => Math.round(Number(String(v).replace(",", ".")) * 100));
    if (quantities.some((q) => !Number.isFinite(q)) || prices.some((p) => !Number.isFinite(p))) throw new Error("Revisa cantidades y precios");
    const rate = Number(str(form.get("taxRate")));
    const lines = descriptions.map((description, i) => ({ description, quantity: quantities[i], unitPriceCents: prices[i] }));
    const { inv, corrective, replacement } = await rectifyInvoice(invoiceId, lines, str(form.get("reason")), Number.isInteger(rate) && rate >= 0 && rate <= 30 ? rate : undefined);
    await notify({
      title: `Factura ${inv.number} corregida`,
      body: `Anulada con ${corrective.number} y sustituida por ${replacement.number} · total ${eur(replacement.totalCents)}`,
      href: `/facturacion/${replacement.id}`,
      clientId: inv.clientId,
      tone: "info",
      audience: "ALL",
    });
    return replacement;
  });
}
