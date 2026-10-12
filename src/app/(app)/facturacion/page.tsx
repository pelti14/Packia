import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, requireUser } from "@/lib/auth";
import { invoicePeriodLabel, pendingUsage, usageFor } from "@/lib/billing";
import { applyDuePlanRequests, getPlans } from "@/lib/plans";
import { addDays, startOfDay } from "@/lib/schedule";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { monthKey, monthRange, shiftMonth } from "@/lib/schedule";
import { Card, CardHeader, EmptyState, Notice, PageHeader, Pill, StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { issueAllAction, issueInvoiceAction, issueUntilAction, setInvoicePaid } from "./actions";
import { MonthPicker } from "./month-picker";
import { FileStack } from "lucide-react";

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<{ month?: string; error?: string }> }) {
  const user = await requireUser(["ADMIN", "CLIENT"]);
  await applyDuePlanRequests();
  const scope = clientScope(user);
  const current = monthKey();
  const { month: m, error } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) && m <= current ? m : current;
  const { start, end } = monthRange(month);
  const tomorrow = addDays(startOfDay(), 1);
  const closed = month < current;
  const admin = user.role === "ADMIN";

  const clients = await db.client.findMany({ where: scope.clientId ? { id: scope.clientId } : undefined, orderBy: { name: "asc" } });
  const [usages, pendings, monthInvoices, invoices, plans] = await Promise.all([
    Promise.all(clients.map((c) => usageFor(c, month))),
    Promise.all(clients.map((c) => pendingUsage(c, month, closed ? undefined : tomorrow))),
    db.invoice.findMany({ where: { ...scope, periodStart: { gte: start, lt: end } }, orderBy: { periodStart: "asc" } }),
    db.invoice.findMany({ where: scope, include: { client: true }, orderBy: { issuedAt: "desc" }, take: 50 }),
    getPlans(),
  ]);
  const planName = (p: string) => plans.find((x) => x.plan === p)?.label ?? p;
  const invoicesOf = (clientId: string) => monthInvoices.filter((i) => i.clientId === clientId);
  const pendingOf = new Map(pendings.map((p, i) => [clients[i].id, p]));
  const pendingToIssue = pendings.filter((p) => p && p.subtotalCents > 0).length;
  const totalSubtotal = usages.reduce((s, u) => s + u.subtotalCents, 0);
  const totalShipped = usages.reduce((s, u) => s + u.shippedOrders, 0);
  const pendingCents = invoices.filter((i) => i.status === "ISSUED" && i.kind === "INVOICE").reduce((s, i) => s + i.totalCents, 0);

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Facturación"
        description="Cuota del plan, pedidos por encima de lo incluido y devoluciones. Las semanas de prueba no se cobran y el primer mes se prorratea. Las facturas del mes anterior se emiten solas del día 1 al 5 (se puede cambiar en Ajustes)."
        actions={
          <div className="glass flex items-center gap-1 rounded-xl p-1">
            <Link href={`/facturacion?month=${shiftMonth(month, -1)}`} className="rounded-lg p-2 text-ink-500 hover:bg-white hover:text-brand-600" aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <MonthPicker
              value={month}
              options={Array.from({ length: 36 }, (_, i) => shiftMonth(current, -i)).map((m) => ({ value: m, label: formatMonth(monthRange(m).start) }))}
            />
            {month < current ? (
              <Link href={`/facturacion?month=${shiftMonth(month, 1)}`} className="rounded-lg p-2 text-ink-500 hover:bg-white hover:text-brand-600" aria-label="Mes siguiente">
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="p-2 text-ink-400/40"><ChevronRight className="h-4 w-4" /></span>
            )}
          </div>
        }
      />

      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label={closed ? "Facturable del mes" : "Acumulado del mes"} value={eur(totalSubtotal)} hint="Sin IVA" icon={Receipt} tone="brand" />
        <StatCard label="Pedidos enviados" value={totalShipped.toLocaleString("es-ES")} hint={formatMonth(start)} icon={FileText} tone="aqua" />
        <StatCard label="Pendiente de cobro" value={eur(pendingCents)} hint="Facturas emitidas sin pagar" icon={Receipt} tone="amber" />
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Cuota de pedidos por cliente"
          subtitle={closed ? "Mes cerrado: listo para facturar" : "Mes en curso: se actualiza con cada envío. Se factura al cerrar el mes, o antes con «Facturar hasta hoy»."}
          action={
            closed && admin && pendingToIssue > 0 ? (
              <form action={issueAllAction.bind(null, month)}>
                <SubmitButton><FileStack className="h-4 w-4" /> Emitir las {pendingToIssue} facturas</SubmitButton>
              </form>
            ) : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line/70 bg-white/40">
              <tr>
                <th className="table-head">Cliente</th>
                <th className="table-head">Plan</th>
                <th className="table-head w-64">Pedidos enviados</th>
                <th className="table-head">Exceso</th>
                <th className="table-head">Devol.</th>
                <th className="table-head text-right">Importe del mes</th>
                <th className="table-head text-right">Facturas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {usages.map((u) => {
                const pct = Math.min(100, Math.round((u.shippedOrders / Math.max(1, u.includedOrders)) * 100));
                const invs = invoicesOf(u.client.id);
                const pending = pendingOf.get(u.client.id);
                return (
                  <tr key={u.client.id}>
                    <td className="cell font-medium text-ink-900">
                      {admin ? <Link href={`/clientes/${u.client.id}`} className="hover:text-brand-600">{u.client.name}</Link> : u.client.name}
                    </td>
                    <td className="cell text-ink-700">
                      {planName(u.client.plan)}
                      <div className="text-xs text-ink-400">{eur(u.client.monthlyFeeCents)}/mes</div>
                      {u.status === "TRIAL" && <div className="mt-1"><Pill tone="aqua">En prueba hasta {formatDateOnly(new Date(u.billableFrom.getTime() - 86_400_000))}</Pill></div>}
                      {u.status === "PRORATED" && <div className="mt-1"><Pill tone="amber">Prorrateado {Math.round(u.fraction * 100)}% · desde {formatDateOnly(u.billableFrom)}</Pill></div>}
                      {u.status === "NOT_STARTED" && <div className="mt-1"><Pill tone="ink">Aún no era cliente</Pill></div>}
                      {u.status === "ENDED" && <div className="mt-1"><Pill tone="ink">De baja</Pill></div>}
                      {u.client.serviceEndAt && u.status !== "ENDED" && <div className="mt-1"><Pill tone="rose">Baja el {formatDateOnly(u.client.serviceEndAt)}</Pill></div>}
                    </td>
                    <td className="cell">
                      <div className="mono text-sm"><b className="text-ink-900">{u.shippedOrders}</b> <span className="text-ink-400">/ {u.includedOrders}</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
                        <div className={u.extraOrders ? "h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" : "h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400"} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className={u.extraOrders ? "cell mono font-semibold text-amber-600" : "cell mono text-ink-400"}>
                      {u.extraOrders ? `+${u.extraOrders}` : "0"}
                    </td>
                    <td className="cell mono text-ink-700">{u.processedReturns}</td>
                    <td className="cell mono text-right font-semibold text-ink-900">{eur(u.subtotalCents)}</td>
                    <td className="cell text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {invs.map((i) => (
                          <Link key={i.id} href={`/facturacion/${i.id}`} className={i.status === "CANCELLED" || i.kind === "CORRECTIVE" ? "mono text-xs text-ink-400 line-through hover:underline" : "mono text-sm font-semibold text-brand-600 hover:underline"} title={`${invoicePeriodLabel(i)}${i.status === "CANCELLED" ? " · anulada" : i.kind === "CORRECTIVE" ? " · rectificativa" : ""}`}>{i.number}</Link>
                        ))}
                        {pending && pending.subtotalCents > 0 ? (
                          admin ? (
                            <form action={closed ? issueInvoiceAction.bind(null, u.client.id, month) : issueUntilAction.bind(null, u.client.id, `/facturacion?month=${month}`)}>
                              <SubmitButton variant="ghost" className="px-3 py-1.5">{closed ? (invs.length ? "Facturar el resto" : "Emitir factura") : "Facturar hasta hoy"} · {eur(pending.subtotalCents)}</SubmitButton>
                            </form>
                          ) : (
                            <span className="text-xs text-ink-400">{closed ? "Pendiente" : "Se factura al cerrar el mes"}</span>
                          )
                        ) : (
                          !invs.length && <span className="text-xs text-ink-400">{closed ? "Nada que facturar" : "—"}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Facturas emitidas" />
        {invoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Número</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Periodo</th>
                  <th className="table-head">Emitida</th>
                  <th className="table-head text-right">Total</th>
                  <th className="table-head">Estado</th>
                  {admin && <th className="table-head" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {invoices.map((i) => (
                  <tr key={i.id} className="group transition hover:bg-brand-50/40">
                    <td className="cell"><Link href={`/facturacion/${i.id}`} className="mono font-semibold text-ink-900 group-hover:text-brand-600">{i.number}</Link></td>
                    <td className="cell text-ink-700">{i.client.name}</td>
                    <td className="cell text-ink-700">{invoicePeriodLabel(i)}</td>
                    <td className="cell text-ink-500">{formatDateOnly(i.issuedAt)}</td>
                    <td className="cell mono text-right font-semibold text-ink-900">{eur(i.totalCents)}</td>
                    <td className="cell">
                      {i.kind === "CORRECTIVE" ? <Pill tone="ink">Rectificativa</Pill> : i.status === "CANCELLED" ? <Pill tone="rose">Anulada</Pill> : <Pill tone={i.status === "PAID" ? "mint" : "amber"}>{i.status === "PAID" ? "Pagada" : "Pendiente"}</Pill>}
                    </td>
                    {admin && (i.kind !== "INVOICE" || i.status === "CANCELLED") && <td className="cell" />}
                    {admin && i.kind === "INVOICE" && i.status !== "CANCELLED" && (
                      <td className="cell text-right">
                        <form action={setInvoicePaid.bind(null, i.id, i.status !== "PAID")}>
                          <SubmitButton variant="ghost" className="px-3 py-1.5">{i.status === "PAID" ? "Marcar pendiente" : "Marcar pagada"}</SubmitButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Receipt} title="Aún no hay facturas">Al cerrar un mes, emite la factura de cada cliente desde la tabla de arriba.</EmptyState>
        )}
      </Card>
    </>
  );
}
