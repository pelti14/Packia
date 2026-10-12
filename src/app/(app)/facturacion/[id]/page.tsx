import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePen, FileX } from "lucide-react";
import { db } from "@/lib/db";
import { canAccessClient, requireUser } from "@/lib/auth";
import { invoicePeriodLabel, issuer } from "@/lib/billing";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { BackLink, Notice, Pill } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { cancelInvoiceAction } from "../actions";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await requireUser(["ADMIN", "CLIENT"]);
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lines: true,
      corrects: { select: { id: true, number: true } },
      replaces: { select: { id: true, number: true } },
      corrections: { select: { id: true, number: true } },
      replacements: { select: { id: true, number: true } },
    },
  });
  if (!invoice || !canAccessClient(user, invoice.clientId)) notFound();
  const me = await issuer();
  const admin = user.role === "ADMIN";
  const corrective = invoice.kind === "CORRECTIVE";
  const cancelled = invoice.status === "CANCELLED";

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <BackLink href={`/facturacion`}>Facturación</BackLink>
        <PrintButton />
      </div>

      {error && <div className="mx-auto mb-4 max-w-3xl print:hidden"><Notice tone="error">{error}</Notice></div>}

      {(cancelled || corrective || invoice.replaces) && (
        <div className="mx-auto mb-4 max-w-3xl space-y-1 rounded-2xl bg-white/70 p-4 text-sm text-ink-700 ring-1 ring-line print:hidden">
          {cancelled && (
            <div>
              <b className="text-rose-500">Factura anulada</b>{invoice.cancelledAt ? ` el ${formatDateOnly(invoice.cancelledAt)}` : ""}
              {invoice.reason ? ` · ${invoice.reason}` : ""}
              {invoice.corrections.map((c) => <span key={c.id}> · rectificativa <Link href={`/facturacion/${c.id}`} className="mono font-semibold text-brand-600 underline">{c.number}</Link></span>)}
              {invoice.replacements.map((r) => <span key={r.id}> · sustituida por <Link href={`/facturacion/${r.id}`} className="mono font-semibold text-brand-600 underline">{r.number}</Link></span>)}
            </div>
          )}
          {corrective && invoice.corrects && (
            <div>Rectificativa que anula la factura <Link href={`/facturacion/${invoice.corrects.id}`} className="mono font-semibold text-brand-600 underline">{invoice.corrects.number}</Link>.</div>
          )}
          {invoice.replaces && (
            <div>Sustituye a la factura <Link href={`/facturacion/${invoice.replaces.id}`} className="mono font-semibold text-brand-600 underline">{invoice.replaces.number}</Link>{invoice.reason ? ` · ${invoice.reason}` : ""}.</div>
          )}
        </div>
      )}

      {admin && !corrective && !cancelled && (
        <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-end gap-2 rounded-2xl bg-white/70 p-4 ring-1 ring-line print:hidden">
          <Link href={`/facturacion/${invoice.id}/rectificar`} className="btn-ghost"><FilePen className="h-4 w-4" /> Corregir factura</Link>
          <form action={cancelInvoiceAction.bind(null, invoice.id)} className="flex flex-1 flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label className="label" htmlFor="reason">Motivo para anular</label>
              <input id="reason" name="reason" required className="input py-2" placeholder="Error en el periodo, cliente equivocado…" />
            </div>
            <ConfirmSubmit variant="danger" confirm={`¿Anular la factura ${invoice.number}? Se emitirá una rectificativa en negativo y el periodo quedará libre para volver a facturarlo.`}>
              <FileX className="h-4 w-4" /> Anular
            </ConfirmSubmit>
          </form>
          <p className="w-full text-xs text-ink-400">Una factura emitida no se borra: al anularla o corregirla se emite una <b>factura rectificativa</b> (serie R) enlazada, como exige Hacienda.</p>
        </div>
      )}

      <article className="glass relative mx-auto max-w-3xl overflow-hidden p-8 sm:p-12 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        {cancelled && (
          <div className="pointer-events-none absolute right-8 top-40 rotate-[-14deg] rounded-xl border-4 border-rose-500/70 px-5 py-2 font-display text-4xl font-bold tracking-widest text-rose-500/70">ANULADA</div>
        )}
        <header className="flex flex-col justify-between gap-6 border-b border-line pb-8 sm:flex-row">
          <div className="flex items-start gap-3">
            <LogoMark className="h-11 w-11" />
            <div className="text-sm leading-relaxed text-ink-700">
              <div className="font-display text-lg font-bold text-ink-900">{me.name}</div>
              {me.taxId && <div>NIF {me.taxId}</div>}
              {me.address && <div>{me.address}</div>}
              {me.email && <div>{me.email}</div>}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{corrective ? "Factura rectificativa" : "Factura"}</div>
            <div className="mono mt-1 text-2xl font-bold text-ink-900">{invoice.number}</div>
            <div className="mt-2 text-sm text-ink-500">Fecha: {formatDateOnly(invoice.issuedAt)}</div>
            <div className="text-sm text-ink-500">Periodo: {invoicePeriodLabel(invoice)}</div>
            {corrective && invoice.corrects && <div className="text-sm text-ink-500">Rectifica: <span className="mono">{invoice.corrects.number}</span></div>}
            {invoice.replaces && <div className="text-sm text-ink-500">Sustituye a: <span className="mono">{invoice.replaces.number}</span></div>}
            <div className="mt-2 print:hidden">
              {corrective ? <Pill tone="ink">Rectificativa</Pill> : cancelled ? <Pill tone="rose">Anulada</Pill> : <Pill tone={invoice.status === "PAID" ? "mint" : "amber"}>{invoice.status === "PAID" ? "Pagada" : "Pendiente de pago"}</Pill>}
            </div>
          </div>
        </header>

        <section className="py-8 text-sm leading-relaxed">
          <div className="label">Facturar a</div>
          <div className="font-semibold text-ink-900">{invoice.client.name}</div>
          {invoice.client.taxId && <div className="text-ink-700">NIF {invoice.client.taxId}</div>}
          {invoice.client.billingAddress && <div className="whitespace-pre-line text-ink-700">{invoice.client.billingAddress}</div>}
          {invoice.client.contactEmail && <div className="text-ink-700">{invoice.client.contactEmail}</div>}
        </section>

        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Concepto</th>
              <th className="whitespace-nowrap py-3 pl-6 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Cant.</th>
              <th className="whitespace-nowrap py-3 pl-6 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Precio</th>
              <th className="whitespace-nowrap py-3 pl-6 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-3 text-ink-900">{l.description}</td>
                <td className="mono whitespace-nowrap py-3 pl-6 text-right">{l.quantity}</td>
                <td className="mono whitespace-nowrap py-3 pl-6 text-right">{eur(l.unitPriceCents)}</td>
                <td className="mono whitespace-nowrap py-3 pl-6 text-right font-medium">{eur(l.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Base imponible</span><span className="mono">{eur(invoice.subtotalCents)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">IVA {invoice.taxRate}%</span><span className="mono">{eur(invoice.taxCents)}</span></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><span>Total</span><span className="mono">{eur(invoice.totalCents)}</span></div>
        </div>

        {corrective && invoice.reason && (
          <p className="mt-6 text-sm text-ink-700"><b>Motivo de la rectificación:</b> {invoice.reason}. Rectificación por anulación total de la factura {invoice.corrects?.number} (art. 15 del Reglamento de facturación).</p>
        )}

        {me.iban && !corrective && (
          <footer className="mt-10 rounded-xl bg-brand-50/60 p-4 text-sm text-ink-700 ring-1 ring-brand-100 print:bg-transparent print:ring-line">
            Forma de pago: transferencia o domiciliación SEPA a <span className="mono font-semibold">{me.iban}</span>
          </footer>
        )}
      </article>
    </>
  );
}
