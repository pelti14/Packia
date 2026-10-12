import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessClient, requireUser } from "@/lib/auth";
import { issuer } from "@/lib/billing";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { BackLink, Pill } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["ADMIN", "CLIENT"]);
  const invoice = await db.invoice.findUnique({ where: { id }, include: { client: true, lines: true } });
  if (!invoice || !canAccessClient(user, invoice.clientId)) notFound();
  const me = issuer();

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <BackLink href={`/facturacion`}>Facturación</BackLink>
        <PrintButton />
      </div>

      <article className="glass mx-auto max-w-3xl p-8 sm:p-12 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
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
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Factura</div>
            <div className="mono mt-1 text-2xl font-bold text-ink-900">{invoice.number}</div>
            <div className="mt-2 text-sm text-ink-500">Fecha: {formatDateOnly(invoice.issuedAt)}</div>
            <div className="text-sm text-ink-500">Periodo: {formatMonth(invoice.periodStart)}</div>
            <div className="mt-2 print:hidden"><Pill tone={invoice.status === "PAID" ? "mint" : "amber"}>{invoice.status === "PAID" ? "Pagada" : "Pendiente de pago"}</Pill></div>
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
              <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Cant.</th>
              <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Precio</th>
              <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-3 text-ink-900">{l.description}</td>
                <td className="mono py-3 text-right">{l.quantity}</td>
                <td className="mono py-3 text-right">{eur(l.unitPriceCents)}</td>
                <td className="mono py-3 text-right font-medium">{eur(l.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Base imponible</span><span className="mono">{eur(invoice.subtotalCents)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">IVA {invoice.taxRate}%</span><span className="mono">{eur(invoice.taxCents)}</span></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><span>Total</span><span className="mono">{eur(invoice.totalCents)}</span></div>
        </div>

        {me.iban && (
          <footer className="mt-10 rounded-xl bg-brand-50/60 p-4 text-sm text-ink-700 ring-1 ring-brand-100 print:bg-transparent print:ring-line">
            Forma de pago: transferencia o domiciliación SEPA a <span className="mono font-semibold">{me.iban}</span>
          </footer>
        )}
      </article>
    </>
  );
}
