import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, PackageCheck, Plug, Send, Target } from "lucide-react";
import { db } from "@/lib/db";
import { formatDay, startOfDay, startOfMonth, timeAgo } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, PlatformBadge, StatCard, StatusBadge } from "@/components/ui";

const CUTOFF_HOUR = 14;

function units(items: { quantity: number }[]) {
  const n = items.reduce((s, i) => s + i.quantity, 0);
  return `${n} ${n === 1 ? "ud." : "uds."}`;
}

/** Un pedido llega a tiempo si sale el mismo día (antes del corte) o al día siguiente (después del corte). */
function shippedOnTime(placedAt: Date, shippedAt: Date) {
  const deadline = startOfDay(placedAt);
  if (placedAt.getHours() >= CUTOFF_HOUR) deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(23, 59, 59, 999);
  return shippedAt <= deadline;
}

export default async function Dashboard() {
  const today = startOfDay();
  const since14 = new Date(today);
  since14.setDate(since14.getDate() - 13);
  const since30 = new Date(today);
  since30.setDate(since30.getDate() - 30);

  const [open, shippedToday, stores, recentShipped, last14, queue, clients, products] = await Promise.all([
    db.order.count({ where: { status: { in: ["PENDING", "PICKING", "PACKED"] } } }),
    db.order.count({ where: { status: "SHIPPED", shippedAt: { gte: today } } }),
    db.store.count(),
    db.order.findMany({ where: { status: "SHIPPED", shippedAt: { gte: since30 } }, select: { placedAt: true, shippedAt: true } }),
    db.order.findMany({ where: { placedAt: { gte: since14 } }, select: { placedAt: true } }),
    db.order.findMany({
      where: { status: { in: ["PENDING", "PICKING", "PACKED"] } },
      orderBy: { placedAt: "asc" },
      take: 6,
      include: { client: true, store: true, items: true },
    }),
    db.client.findMany({ include: { _count: { select: { orders: { where: { placedAt: { gte: startOfMonth() } } } } } }, orderBy: { name: "asc" } }),
    db.product.findMany({ include: { client: true } }),
  ]);

  const onTime = recentShipped.filter((o) => o.shippedAt && shippedOnTime(o.placedAt, o.shippedAt)).length;
  const onTimeRate = recentShipped.length ? Math.round((onTime / recentShipped.length) * 1000) / 10 : 100;
  const lowStock = products.filter((p) => p.stock <= p.lowStockAt).sort((a, b) => a.stock - b.stock).slice(0, 5);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14);
    d.setDate(d.getDate() + i);
    return { date: d, count: 0 };
  });
  for (const o of last14) {
    const idx = Math.floor((startOfDay(o.placedAt).getTime() - since14.getTime()) / 86_400_000);
    if (days[idx]) days[idx].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const total14 = days.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Centro de operaciones"
        title={<>Hoy salen <span className="text-gradient">{open}</span> pedidos</>}
        description="Todo lo que entra antes de la hora de corte se prepara y sale hoy. Estado en tiempo real de tus tiendas conectadas."
        actions={
          <Link href="/pedidos?status=PENDING" className="btn-primary">
            Empezar a preparar <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="En cola" value={open} hint="Pendientes, preparando y embalados" icon={Clock3} tone="amber" />
        <StatCard label="Enviados hoy" value={shippedToday} hint="Con seguimiento devuelto a la tienda" icon={Send} tone="mint" />
        <StatCard label="A tiempo · 30 días" value={`${onTimeRate}%`} hint={`${onTime} de ${recentShipped.length} envíos dentro del corte`} icon={Target} tone="brand" />
        <StatCard label="Tiendas conectadas" value={stores} hint="Shopify y WooCommerce" icon={Plug} tone="aqua" />
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
                          ? "w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-aqua-400 shadow-[0_0_24px_-4px_rgb(79_107_255/0.6)]"
                          : "w-full rounded-t-lg bg-gradient-to-t from-brand-200 to-brand-100 transition group-hover:from-brand-400 group-hover:to-aqua-400"
                      }
                      style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
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
          <CardHeader title="Uso del plan este mes" subtitle="Pedidos frente a los incluidos en la cuota" />
          <div className="space-y-5 px-5 py-5">
            {clients.map((c) => {
              const used = c._count.orders;
              const pct = Math.min(100, Math.round((used / c.planOrders) * 100));
              const over = used > c.planOrders;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink-900">{c.name}</span>
                    <span className="mono text-ink-500">
                      <b className={over ? "text-amber-600" : "text-ink-900"}>{used}</b> / {c.planOrders}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
                    <div
                      className={over ? "h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" : "h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {over && <div className="mt-1 text-[11px] text-amber-600">{used - c.planOrders} pedidos de exceso a facturar</div>}
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
            title="Siguientes en la cola"
            subtitle="Los más antiguos primero"
            action={<Link href="/pedidos" className="text-xs font-semibold text-brand-600 hover:underline">Ver todos</Link>}
          />
          {queue.length ? (
            <ul className="divide-y divide-line/70">
              {queue.map((o) => (
                <li key={o.id}>
                  <Link href={`/pedidos/${o.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-brand-50/40">
                    <div className="mono w-16 font-semibold text-ink-900">{o.number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-900">{o.customerName}</div>
                      <div className="flex items-center gap-2 text-xs text-ink-400">
                        {o.client.name} · <PlatformBadge platform={o.store.platform} />
                      </div>
                    </div>
                    <div className="hidden text-xs text-ink-500 sm:block">{units(o.items)}</div>
                    <div className="hidden w-24 text-right text-xs text-ink-400 md:block">{timeAgo(o.placedAt)}</div>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={PackageCheck} title="Cola vacía">Todo enviado. Buen trabajo.</EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Stock bajo" subtitle="Avisar al cliente para reponer" />
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
            <EmptyState icon={PackageCheck} title="Stock correcto">Ningún producto por debajo del mínimo.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
