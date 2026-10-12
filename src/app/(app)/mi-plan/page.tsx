import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, Check, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { usageFor } from "@/lib/billing";
import { applyDuePlanRequests, defaultLastDay, getPlans, monthlyIncluded, nextMonthStart } from "@/lib/plans";
import { dayKey, monthKey } from "@/lib/schedule";
import { eur, formatDateOnly, formatMonth } from "@/lib/format";
import { downgradePlan, requestCancellation, upgradePlan, withdrawRequest } from "@/app/plan-actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Notice, PageHeader, Pill } from "@/components/ui";
import { BrandName } from "@/components/brand";

export default async function MiPlanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; c?: string }> }) {
  const user = await requireUser();
  const { ok, error, c } = await searchParams;
  // El equipo llega aquí desde un aviso: lo llevamos a la ficha del cliente.
  if (user.role !== "CLIENT") redirect(c ? `/clientes/${c}` : "/clientes");
  if (!user.clientId) redirect("/");
  await applyDuePlanRequests();
  const client = await db.client.findUniqueOrThrow({ where: { id: user.clientId } });
  const [plans, usage, included, pending] = await Promise.all([
    getPlans(),
    usageFor(client, monthKey()),
    monthlyIncluded(client),
    db.planRequest.findMany({ where: { clientId: client.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);
  const current = plans.find((p) => p.plan === client.plan);
  const custom = !current || current.orders !== client.planOrders || current.feeCents !== client.monthlyFeeCents;
  const downgrade = pending.find((r) => r.type === "DOWNGRADE" || r.type === "CHANGE");
  const cancel = pending.find((r) => r.type === "CANCEL");
  const pct = Math.min(100, Math.round((usage.shippedOrders / Math.max(1, included)) * 100));

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Mi plan" description="Sube de plan cuando lo necesites, bájalo para el mes que viene o solicita la baja. Sin permanencia." />
      {ok && <div className="mb-4"><Notice tone="success">{ok}</Notice></div>}
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">Plan actual</div>
              <div className="mt-1 font-display text-3xl font-bold text-ink-900">{current?.label ?? client.plan}{custom && <span className="ml-2 align-middle text-sm font-medium text-ink-400">(condiciones personalizadas)</span>}</div>
              <div className="mt-1 text-sm text-ink-500">{eur(client.monthlyFeeCents)}/mes + IVA · {client.planOrders} pedidos incluidos · adicional {eur(client.extraOrderFeeCents)}</div>
            </div>
            {client.serviceEndAt ? <Pill tone="rose">Baja: último día {formatDateOnly(client.serviceEndAt)}</Pill> : <Pill tone="mint">Activo</Pill>}
          </div>
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-500">Pedidos enviados en {formatMonth(new Date())}</span>
              <span className="mono"><b className="text-ink-900">{usage.shippedOrders}</b> <span className="text-ink-400">/ {included}</span></span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
              <div className={clsx("h-full rounded-full bg-gradient-to-r", usage.shippedOrders > included ? "from-amber-500 to-rose-500" : "from-brand-500 to-aqua-400")} style={{ width: `${pct}%` }} />
            </div>
            {included !== client.planOrders && <p className="mt-2 text-xs text-ink-400">Este mes cuenta con {included} pedidos incluidos por los cambios de plan o la fecha de alta (se reparte por días).</p>}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-ink-900">Cómo funcionan los cambios</div>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li className="flex gap-2"><ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" /> <span><b>Subir</b> es inmediato. Este mes se reparte por días: cuota y pedidos del plan nuevo desde hoy.</span></li>
            <li className="flex gap-2"><ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> <span><b>Bajar</b> se aplica el día 1 del mes que viene.</span></li>
            <li className="flex gap-2"><LogOut className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> <span><b>La baja</b> la confirmamos nosotros. Se factura hasta el último día de servicio.</span></li>
          </ul>
        </Card>
      </div>

      {(downgrade || cancel) && (
        <div className="mb-6 space-y-3">
          {downgrade && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-ink-700 ring-1 ring-amber-500/25">
              <span>Cambio programado al plan <b>{plans.find((p) => p.plan === downgrade.plan)?.label ?? downgrade.plan}</b> desde el <b>{formatDateOnly(downgrade.effectiveAt)}</b>.</span>
              <form action={withdrawRequest.bind(null, downgrade.id, "/mi-plan")}><SubmitButton variant="ghost" className="px-3 py-1.5">Anular cambio</SubmitButton></form>
            </div>
          )}
          {cancel && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-ink-700 ring-1 ring-rose-500/20">
              <span>Has solicitado la baja con último día <b>{formatDateOnly(cancel.effectiveAt)}</b>. Pendiente de confirmar por <BrandName />.</span>
              <form action={withdrawRequest.bind(null, cancel.id, "/mi-plan")}><SubmitButton variant="ghost" className="px-3 py-1.5">Ya no quiero darme de baja</SubmitButton></form>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.plan === client.plan;
          const up = p.orders > client.planOrders;
          return (
            <Card key={p.plan} className={clsx("flex flex-col p-6", isCurrent && "ring-2 ring-brand-500")}>
              <div className="flex items-center justify-between">
                <div className="font-display text-xl font-bold text-ink-900">{p.label}</div>
                {isCurrent && <Pill tone="brand">Tu plan</Pill>}
              </div>
              <div className="mt-3 font-display text-4xl font-bold text-ink-900">{eur(p.feeCents)}<span className="text-base font-medium text-ink-400"> /mes</span></div>
              <ul className="mt-4 space-y-2 text-sm text-ink-600">
                <li className="flex gap-2"><Check className="h-4 w-4 text-mint-500" /> {p.orders} pedidos incluidos</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-mint-500" /> Pedido adicional {eur(p.extraCents)}</li>
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <div className="text-center text-sm font-medium text-ink-400">Plan actual</div>
                ) : client.serviceEndAt ? null : up ? (
                  <form action={upgradePlan.bind(null, p.plan)}>
                    <ConfirmSubmit className="w-full" confirm={`¿Subir al plan ${p.label} desde hoy? Este mes se prorratea por días.`}><ArrowUp className="h-4 w-4" /> Subir a {p.label}</ConfirmSubmit>
                  </form>
                ) : (
                  <form action={downgradePlan.bind(null, p.plan)}>
                    <ConfirmSubmit variant="ghost" className="w-full" confirm={`¿Bajar al plan ${p.label} desde el ${formatDateOnly(nextMonthStart())}?`}><ArrowDown className="h-4 w-4" /> Bajar a {p.label} desde el día 1</ConfirmSubmit>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {!client.serviceEndAt && !cancel && (
        <Card>
          <CardHeader title="Solicitar la baja del servicio" subtitle="Sin permanencia. Te pediremos recoger o reenviar tu stock restante." />
          <form action={requestCancellation} className="grid gap-4 p-5 md:grid-cols-[14rem_1fr_auto] md:items-end">
            <div>
              <label className="label" htmlFor="lastDay">Último día de servicio</label>
              <input id="lastDay" name="lastDay" type="date" min={dayKey(new Date())} defaultValue={dayKey(defaultLastDay())} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="reason">Motivo (opcional)</label>
              <input id="reason" name="reason" className="input" placeholder="Nos ayuda a mejorar" maxLength={500} />
            </div>
            <ConfirmSubmit variant="danger" confirm="¿Seguro que quieres solicitar la baja? Te contactaremos para confirmarla.">Solicitar la baja</ConfirmSubmit>
          </form>
        </Card>
      )}
    </>
  );
}
