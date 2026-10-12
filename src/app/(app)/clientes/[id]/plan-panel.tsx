import Link from "next/link";
import { CalendarClock, FileText, History, LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { dayKey, monthKey, monthRange } from "@/lib/schedule";
import { eur, formatDate, formatDateOnly } from "@/lib/format";
import { invoicePeriodLabel, pendingUsage, invoicedUntil } from "@/lib/billing";
import { defaultLastDay, getPlans } from "@/lib/plans";
import { addDays, startOfDay } from "@/lib/schedule";
import { issueUntilAction } from "@/app/(app)/facturacion/actions";
import { confirmCancellation, rejectRequest, setServiceEnd, withdrawRequest } from "@/app/plan-actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Pill } from "@/components/ui";

const TYPE: Record<string, string> = { UPGRADE: "Subida de plan", DOWNGRADE: "Bajada de plan", CANCEL: "Solicitud de baja", CHANGE: "Cambio programado" };
const STATUS: Record<string, { label: string; tone: "amber" | "mint" | "rose" | "ink" }> = {
  PENDING: { label: "Pendiente", tone: "amber" },
  APPLIED: { label: "Aplicada", tone: "mint" },
  REJECTED: { label: "Rechazada", tone: "rose" },
  WITHDRAWN: { label: "Anulada", tone: "ink" },
};

/** Ficha del cliente: peticiones, baja, historial de planes y facturar hasta un día. */
export async function PlanPanel({ clientId }: { clientId: string }) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const path = `/clientes/${clientId}`;
  const [requests, changes, plans, invoices, from, pending] = await Promise.all([
    db.planRequest.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.planChange.findMany({ where: { clientId }, orderBy: { effectiveAt: "desc" }, take: 10 }),
    getPlans(),
    db.invoice.findMany({ where: { clientId }, orderBy: { periodStart: "desc" }, take: 6 }),
    invoicedUntil(clientId, monthKey()),
    pendingUsage(client, monthKey(), addDays(startOfDay(), 1)),
  ]);
  const label = (p: string | null) => (p ? plans.find((x) => x.plan === p)?.label ?? p : "");
  const open = requests.filter((r) => r.status === "PENDING");
  const today = dayKey(new Date());

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Peticiones y baja" subtitle="Lo que pide el cliente desde «Mi plan» y los cambios programados" />
        <div className="space-y-4 p-5">
          {client.serviceEndAt ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-500 ring-1 ring-rose-500/20">
              <span><b>De baja.</b> Último día de servicio: {formatDateOnly(client.serviceEndAt)}</span>
              <form action={setServiceEnd.bind(null, clientId)}>
                <input type="hidden" name="reactivate" value="1" />
                <SubmitButton variant="ghost" className="px-3 py-1.5">Reactivar</SubmitButton>
              </form>
            </div>
          ) : null}

          {open.length === 0 && !client.serviceEndAt && <p className="text-sm text-ink-500">No hay peticiones pendientes.</p>}

          {open.map((r) => (
            <div key={r.id} className="rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-500/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-ink-900">{TYPE[r.type]}{r.plan ? ` → ${label(r.plan)}` : ""}</div>
                <Pill tone="amber">{r.type === "CANCEL" ? `Último día ${formatDateOnly(r.effectiveAt)}` : `Desde ${formatDateOnly(r.effectiveAt)}`}</Pill>
              </div>
              <div className="mt-1 text-xs text-ink-500">Pedida por {r.createdBy ?? "—"} · {formatDate(r.createdAt)}</div>
              {r.note && <p className="mt-2 text-sm text-ink-700">«{r.note}»</p>}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                {r.type === "CANCEL" && (
                  <form action={confirmCancellation.bind(null, r.id)} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="label" htmlFor={`d-${r.id}`}>Último día</label>
                      <input id={`d-${r.id}`} type="date" name="lastDay" defaultValue={dayKey(r.effectiveAt)} min={today} className="input py-1.5" />
                    </div>
                    <SubmitButton className="px-3 py-1.5">Confirmar baja</SubmitButton>
                  </form>
                )}
                {r.type !== "CANCEL" && <span className="text-xs text-ink-500">Se aplica sola en esa fecha.</span>}
                <form action={r.type === "CANCEL" ? rejectRequest.bind(null, r.id) : withdrawRequest.bind(null, r.id, path)}>
                  <SubmitButton variant="ghost" className="px-3 py-1.5">{r.type === "CANCEL" ? "Rechazar" : "Anular"}</SubmitButton>
                </form>
              </div>
            </div>
          ))}

          {!client.serviceEndAt && !open.some((r) => r.type === "CANCEL") && (
            <details className="rounded-xl bg-white/60 p-4 ring-1 ring-line">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700"><LogOut className="h-4 w-4" /> Dar de baja al cliente</summary>
              <form action={setServiceEnd.bind(null, clientId)} className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="label" htmlFor="lastDay">Último día de servicio</label>
                  <input id="lastDay" type="date" name="lastDay" defaultValue={dayKey(defaultLastDay())} className="input py-1.5" />
                </div>
                <SubmitButton variant="ghost" className="px-3 py-1.5">Registrar baja</SubmitButton>
              </form>
            </details>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Facturar ahora" subtitle={from.getTime() === monthRange(monthKey()).start.getTime() ? "Este mes aún no tiene facturas" : `Este mes facturado hasta el ${formatDateOnly(addDays(from, -1))}`} action={<Link href="/facturacion" className="text-xs font-semibold text-brand-600 hover:underline">Facturación</Link>} />
        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-500">Emite una factura de lo que lleva este mes hasta el día que elijas (por una baja, un acuerdo…). Al cerrar el mes solo se facturará lo que falte.</p>
          <div className="flex flex-wrap items-end gap-2">
            <form action={issueUntilAction.bind(null, clientId, path)}>
              <SubmitButton><FileText className="h-4 w-4" /> Facturar hasta hoy{pending && pending.subtotalCents > 0 ? ` · ${eur(pending.subtotalCents)}` : ""}</SubmitButton>
            </form>
            <form action={issueUntilAction.bind(null, clientId, path)} className="flex items-end gap-2">
              <div>
                <label className="label" htmlFor="until">Hasta el día</label>
                <input id="until" type="date" name="until" defaultValue={client.serviceEndAt && monthKey(client.serviceEndAt) === monthKey() ? dayKey(client.serviceEndAt) : today} className="input py-1.5" />
              </div>
              <SubmitButton variant="ghost" className="px-3 py-2"><CalendarClock className="h-4 w-4" /> Facturar</SubmitButton>
            </form>
          </div>
          {invoices.length > 0 && (
            <ul className="divide-y divide-line/60 rounded-xl ring-1 ring-line">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/facturacion/${i.id}`} className="mono font-semibold text-brand-600 hover:underline">{i.number}</Link>
                  <span className="text-ink-500">{invoicePeriodLabel(i)}</span>
                  <span className="mono font-semibold">{eur(i.totalCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader title="Historial de planes" subtitle="Cada cambio cuenta desde su fecha: la factura reparte cuota y pedidos incluidos por días" />
        {changes.length || requests.length ? (
          <ul className="divide-y divide-line/60">
            {changes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <History className="h-4 w-4 text-brand-500" />
                <span className="font-medium text-ink-900">{formatDateOnly(c.effectiveAt)}</span>
                <span className="text-ink-700">
                  {label(c.fromPlan)} ({c.fromOrders} ped. · {eur(c.fromFeeCents)}) → <b>{label(c.toPlan)}</b> ({c.toOrders} ped. · {eur(c.toFeeCents)})
                </span>
                <span className="ml-auto text-xs text-ink-400">{c.source === "CLIENT" ? "Lo pidió el cliente" : c.source === "SETTINGS" ? "Cambio de tarifas en Ajustes" : "Administrador"}{c.createdBy ? ` · ${c.createdBy}` : ""}</span>
              </li>
            ))}
            {requests.filter((r) => r.status !== "PENDING").map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm text-ink-500">
                <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                {TYPE[r.type]}{r.plan ? ` → ${label(r.plan)}` : ""} · {formatDateOnly(r.effectiveAt)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-5 text-sm text-ink-500">Sin cambios de plan todavía.</p>
        )}
      </Card>
    </div>
  );
}
