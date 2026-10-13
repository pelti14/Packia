import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, PackageCheck, PackagePlus, Send, Siren, Target } from "lucide-react";
import { db } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { monthlyIncluded } from "@/lib/plans";
import { clientScope, isStaff, requireUser } from "@/lib/auth";
import { formatDateOnly, formatDay, timeAgo, units } from "@/lib/format";
import { addDays, dayKey, shippedOnTime, startOfDay, startOfMonth, urgency, slaStart } from "@/lib/schedule";
import { Card, CardHeader, EmptyState, Notice, PageHeader, PlatformBadge, StatCard, StatusBadge } from "@/components/ui";

/** Con pocos envíos el porcentaje engaña (1 envío tarde = 0 %): no se muestra hasta tener muestra. */
const MIN_SLA_SAMPLE = 10;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser();
  const brand = await getBrand();
  const scope = clientScope(user);
  const today = startOfDay();
  const since14 = addDays(today, -13);
  const since30 = addDays(today, -30);

  const [openOrders, shippedToday, recentShipped, last14, clients, products, inbounds] = await Promise.all([
    db.order.findMany({
      where: { ...scope, status: { in: ["PENDING", "PICKING", "PACKED"] } },
      orderBy: { placedAt: "asc" },
      include: { client: true, store: true, items: true },
    }),
    db.order.count({ where: { ...scope, status: "SHIPPED", shippedAt: { gte: today } } }),
    db.order.findMany({ where: { ...scope, status: "SHIPPED", shippedAt: { gte: since30 } }, select: { placedAt: true, createdAt: true, shippedAt: true } }),
    db.order.findMany({ where: { ...scope, placedAt: { gte: since14 } }, select: { placedAt: true } }),
    db.client.findMany({
      where: scope.clientId ? { id: scope.clientId } : undefined,
      include: { _count: { select: { orders: { where: { status: "SHIPPED", shippedAt: { gte: startOfMonth() } } } } } },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({ where: scope, include: { client: true } }),
    db.inbound.findMany({ where: { ...scope, status: "EXPECTED" }, include: { client: true, items: true }, orderBy: { expectedAt: "asc" }, take: 4 }),
  ]);

  const quotaOf = new Map(await Promise.all(clients.map(async (c) => [c.id, await monthlyIncluded(c)] as const)));
  const dueNow = openOrders.filter((o) => urgency(slaStart(o)) !== "LATER");
  const overdue = openOrders.filter((o) => urgency(slaStart(o)) === "OVERDUE").length;
  const onTime = recentShipped.filter((o) => o.shippedAt && shippedOnTime(slaStart(o), o.shippedAt)).length;
  const onTimeRate = recentShipped.length ? Math.round((onTime / recentShipped.length) * 1000) / 10 : 100;
  const lowStock = products.filter((p) => p.stock <= p.lowStockAt).sort((a, b) => a.stock - b.stock).slice(0, 5);

  const days = Array.from({ length: 14 }, (_, i) => ({ date: addDays(since14, i), count: 0 }));
  const index = new Map(days.map((d, i) => [dayKey(d.date), i]));
  for (const o of last14) {
    const i = index.get(dayKey(o.placedAt));
    if (i !== undefined) days[i].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const total14 = days.reduce((s, d) => s + d.count, 0);

  return (
    <>
      {error === "sin-permiso" && <div className="mb-6"><Notice tone="error">No tienes permiso para ver esa sección.</Notice></div>}
      <PageHeader
        eyebrow={user.clientName ?? "Centro de operaciones"}
        title={<>Hoy tienen que salir <span className="text-gradient">{dueNow.length}</span> pedidos</>}
        description={
          isStaff(user)
            ? "Todo lo que entra antes de las 14:00 en día laborable sale hoy. Lo que entra después, el siguiente día laborable."
            : `Estado en tiempo real de tus pedidos, tu stock y tus recepciones en el almacén de ${brand.name}.`
        }
        actions={
          <Link href="/salida" className="btn-primary">
            {isStaff(user) ? "Ir a salida" : "Ver mis pedidos"} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Para hoy" value={dueNow.length} hint={`${openOrders.length} en cola en total`} icon={Clock3} tone="amber" />
        <StatCard label="Retrasados" value={overdue} hint="Llegaron al almacén antes del corte de un día anterior y aún no han salido" icon={Siren} tone={overdue ? "rose" : "mint"} />
        <StatCard label="Enviados hoy" value={shippedToday} hint="Con seguimiento devuelto a la tienda" icon={Send} tone="mint" />
        {recentShipped.length >= MIN_SLA_SAMPLE ? (
          <StatCard label="A tiempo · 30 días" value={`${onTimeRate}%`} hint={`${onTime} de ${recentShipped.length} envíos salieron el día que tocaba`} icon={Target} tone="brand" />
        ) : (
          <StatCard label="A tiempo · 30 días" value="—" hint={`Se calcula a partir de ${MIN_SLA_SAMPLE} envíos (llevamos ${recentShipped.length})`} icon={Target} tone="brand" />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Pedidos recibidos" subtitle={`Últimos 14 días · ${total14} pedidos`} />
          <div className="flex items-end gap-2 px-5 pb-4 pt-8">
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              return (
                <div key={d.date.toISOString()} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-48 w-full items-end">
                    <div
                      className={
                        isToday
                          ? "w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-300 shadow-[0_0_24px_-4px_rgb(150_200_0/0.7)]"
                          : "w-full rounded-t-lg bg-gradient-to-t from-brand-200 to-brand-100 transition group-hover:from-brand-400 group-hover:to-brand-200"
                      }
                      style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }}
                    />
                    <span className="mono pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-ink-700 opacity-0 transition group-hover:opacity-100">
                      {d.count}
                    </span>
                  </div>
                  <span className={isToday ? "text-[10px] font-semibold text-brand-600" : "text-[10px] text-ink-400"}>{formatDay(d.date)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Cuota de pedidos este mes"
            subtitle="Pedidos enviados frente a los incluidos en el plan"
            action={user.role !== "STAFF" && <Link href="/facturacion" className="text-xs font-semibold text-brand-600 hover:underline">Facturación</Link>}
          />
          <div className="space-y-5 px-5 py-5">
            {clients.map((c) => {
              const used = c._count.orders;
              const quota = quotaOf.get(c.id) ?? c.planOrders;
              const pct = Math.min(100, Math.round((used / Math.max(1, quota)) * 100));
              const over = used > quota;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink-900">{c.name}</span>
                    <span className="mono text-ink-500">
                      <b className={over ? "text-amber-600" : "text-ink-900"}>{used}</b> / {quota}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
                    <div
                      className={over ? "h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" : "h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {over && <div className="mt-1 text-[11px] text-amber-600">{used - quota} pedidos por encima del plan</div>}
                </div>
              );
            })}
            {!clients.length && <p className="text-sm text-ink-500">Aún no hay clientes.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Siguientes en salir"
            subtitle="Los más urgentes primero"
            action={<Link href="/salida" className="text-xs font-semibold text-brand-600 hover:underline">Ver todos</Link>}
          />
          {openOrders.length ? (
            <ul className="divide-y divide-line/70">
              {openOrders.slice(0, 6).map((o) => {
                const u = urgency(slaStart(o));
                return (
                  <li key={o.id}>
                    <Link href={`/salida/${o.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-brand-50/40">
                      <div className="mono w-20 font-semibold text-ink-900">{o.number}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink-900">{o.customerName}</div>
                        <div className="flex items-center gap-2 text-xs text-ink-400">
                          {o.client.name} · <PlatformBadge platform={o.store.platform} />
                        </div>
                      </div>
                      <div className="hidden text-xs text-ink-500 sm:block">{units(o.items)}</div>
                      <div className="hidden w-24 text-right text-xs md:block">
                        {u === "OVERDUE" ? <span className="font-semibold text-rose-500">Retrasado</span> : <span className="text-ink-400">{timeAgo(o.placedAt)}</span>}
                      </div>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={PackageCheck} title="Cola vacía">Todo enviado. Buen trabajo.</EmptyState>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Recepciones previstas" action={<Link href="/recepcion" className="text-xs font-semibold text-brand-600 hover:underline">Ver</Link>} />
            {inbounds.length ? (
              <ul className="divide-y divide-line/70">
                {inbounds.map((r) => (
                  <li key={r.id}>
                    <Link href={`/recepcion/${r.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40">
                      <PackagePlus className="h-4 w-4 text-aqua-600" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink-900">{r.reference}</div>
                        <div className="text-xs text-ink-400">{r.client.name}</div>
                      </div>
                      <div className="text-right text-xs text-ink-500">
                        <div className="mono font-semibold text-ink-900">{r.items.reduce((s, i) => s + i.expectedQty, 0)} uds.</div>
                        {r.expectedAt && formatDateOnly(r.expectedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ink-500">No hay mercancía prevista.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Stock bajo" subtitle="Reponer pronto" />
            {lowStock.length ? (
              <ul className="divide-y divide-line/70">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <AlertTriangle className={p.stock <= 0 ? "h-4 w-4 text-rose-500" : "h-4 w-4 text-amber-500"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-900">{p.name}</div>
                      <div className="text-xs text-ink-400">{p.client.name} · <span className="mono">{p.sku}</span></div>
                    </div>
                    <div className={p.stock <= 0 ? "mono font-semibold text-rose-500" : "mono font-semibold text-amber-600"}>{p.stock}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ink-500">Ningún producto por debajo del mínimo.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
