import Link from "next/link";
import { clsx } from "clsx";
import { Inbox } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { Card, EmptyState, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "OPEN", label: "En cola", statuses: ["PENDING", "PICKING", "PACKED"] },
  { key: "PENDING", label: STATUS_LABEL.PENDING, statuses: ["PENDING"] },
  { key: "PICKING", label: STATUS_LABEL.PICKING, statuses: ["PICKING"] },
  { key: "PACKED", label: STATUS_LABEL.PACKED, statuses: ["PACKED"] },
  { key: "SHIPPED", label: STATUS_LABEL.SHIPPED, statuses: ["SHIPPED"] },
  { key: "ALL", label: "Todos" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; client?: string; q?: string }> }) {
  const { status = "OPEN", client, q } = await searchParams;
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];

  const where: Prisma.OrderWhereInput = {
    ...(tab.statuses && { status: { in: tab.statuses } }),
    ...(client && { clientId: client }),
    ...(q && {
      OR: [
        { number: { contains: q } },
        { customerName: { contains: q } },
        { trackingNumber: { contains: q } },
        { client: { name: { contains: q } } },
        { items: { some: { sku: { contains: q } } } },
      ],
    }),
  };

  const [orders, clients, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: tab.key === "SHIPPED" || tab.key === "ALL" ? "desc" : "asc" },
      take: 200,
      include: { client: true, store: true, items: true },
    }),
    db.client.findMany({ orderBy: { name: "asc" } }),
    db.order.groupBy({ by: ["status"], _count: true, where: client ? { clientId: client } : undefined }),
  ]);
  const countOf = (statuses?: OrderStatus[]) =>
    counts.filter((c) => !statuses || statuses.includes(c.status as OrderStatus)).reduce((s, c) => s + c._count, 0);

  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { status, client, q, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/pedidos?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader eyebrow="Operación" title="Pedidos" description="Llegan solos desde Shopify y WooCommerce. Prepara, embala y envía: el seguimiento vuelve a la tienda automáticamente." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass flex gap-1 overflow-x-auto rounded-xl p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ status: t.key })}
              className={clsx(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                t.key === tab.key ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-100" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {t.label}
              <span className={clsx("mono rounded-md px-1.5 text-[11px]", t.key === tab.key ? "bg-brand-50 text-brand-600" : "bg-line/60 text-ink-500")}>
                {countOf(t.statuses)}
              </span>
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={tab.key} />
          {q && <input type="hidden" name="q" value={q} />}
          <select name="client" defaultValue={client ?? ""} className="input w-56">
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn-ghost">Filtrar</button>
        </form>
      </div>

      {q && (
        <div className="mb-4 text-sm text-ink-500">
          Resultados para <b className="text-ink-900">«{q}»</b> · <Link href={href({ q: undefined })} className="text-brand-600 hover:underline">limpiar</Link>
        </div>
      )}

      <Card className="overflow-hidden">
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Pedido</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Destinatario</th>
                  <th className="table-head">Uds.</th>
                  <th className="table-head">Recibido</th>
                  <th className="table-head">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {orders.map((o) => (
                  <tr key={o.id} className="group transition hover:bg-brand-50/40">
                    <td className="cell">
                      <Link href={`/pedidos/${o.id}`} className="mono font-semibold text-ink-900 group-hover:text-brand-600">{o.number}</Link>
                    </td>
                    <td className="cell">
                      <div className="font-medium text-ink-900">{o.client.name}</div>
                      <PlatformBadge platform={o.store.platform} />
                    </td>
                    <td className="cell text-ink-700">{o.customerName}</td>
                    <td className="cell mono text-ink-700">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="cell whitespace-nowrap text-ink-500">{formatDate(o.placedAt)}</td>
                    <td className="cell">
                      <Link href={`/pedidos/${o.id}`}><StatusBadge status={o.status} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Inbox} title="No hay pedidos aquí">Cuando una tienda conectada reciba un pedido pagado, aparecerá en esta lista.</EmptyState>
        )}
      </Card>
    </>
  );
}
