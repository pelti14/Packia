import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRightCircle, Inbox, Printer, Undo2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientScope, isStaff, requireUser } from "@/lib/auth";
import { advanceOrders, revertOrders } from "@/app/actions";
import { ClientBoard, type ClientCard } from "./client-board";
import { formatDate, formatDay } from "@/lib/format";
import { dueKey, madridMidnight, urgency } from "@/lib/schedule";
import { Card, EmptyState, PageHeader, PlatformBadge, StatusBadge, Tabs } from "@/components/ui";

const TABS = [
  { key: "TODAY", label: "Para hoy" },
  { key: "OVERDUE", label: "Retrasados", tone: "rose" as const },
  { key: "PENDING", label: "Sin preparar" },
  { key: "PICKING", label: "Preparando" },
  { key: "PACKED", label: "Listos para etiqueta" },
  { key: "SHIPPED", label: "Enviados" },
  { key: "ALL", label: "Todos" },
];

const OPEN = ["PENDING", "PICKING", "PACKED"];

function dueLabel(placedAt: Date) {
  const u = urgency(placedAt);
  if (u === "OVERDUE") return <span className="font-semibold text-rose-500">Retrasado</span>;
  if (u === "TODAY") return <span className="font-semibold text-brand-600">Hoy</span>;
  const [y, m, d] = dueKey(placedAt).split("-").map(Number);
  return <span className="text-ink-500">{formatDay(madridMidnight(y, m, d))}</span>;
}

export default async function SalidaPage({ searchParams }: { searchParams: Promise<{ tab?: string; client?: string; q?: string }> }) {
  const { tab: tabParam, client, q } = await searchParams;
  const user = await requireUser();
  const staff = isStaff(user);
  const scope = { ...clientScope(user), ...(client && staff ? { clientId: client } : {}) };
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "TODAY";

  const search: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { trackingNumber: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
          { items: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};

  // Los pedidos abiertos son pocos: los clasificamos por urgencia en memoria.
  const [open, shippedCount, allCount, clients] = await Promise.all([
    db.order.findMany({
      where: { ...scope, ...search, status: { in: OPEN } },
      orderBy: { placedAt: "asc" },
      include: { client: true, store: true, items: true },
    }),
    db.order.count({ where: { ...scope, ...search, status: "SHIPPED" } }),
    db.order.count({ where: { ...scope, ...search } }),
    staff ? db.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  // Tarjetas de clientes (sin filtros de búsqueda): cuántos pedidos tiene cada uno por preparar.
  let cards: ClientCard[] = [];
  if (staff) {
    const [allClients, allOpen] = await Promise.all([
      db.client.findMany({ orderBy: { name: "asc" }, include: { stores: { select: { platform: true } } } }),
      db.order.findMany({ where: { status: { in: OPEN } }, select: { clientId: true, status: true, placedAt: true } }),
    ]);
    cards = allClients.map((c) => {
      const mine = allOpen.filter((o) => o.clientId === c.id);
      const due = mine.filter((o) => urgency(o.placedAt) !== "LATER");
      const shipping = c.defaultShipping?.startsWith("packia:") ? c.defaultShipping.slice(7) : c.defaultShipping ? "Sendcloud" : null;
      return {
        id: c.id,
        name: c.name,
        platforms: [...new Set(c.stores.map((s) => (s.platform === "SHOPIFY" ? "Shopify" : "WooCommerce")))],
        shipping,
        open: mine.length,
        today: due.length,
        overdue: due.filter((o) => urgency(o.placedAt) === "OVERDUE").length,
        pending: mine.filter((o) => o.status !== "PACKED").length,
        packed: mine.filter((o) => o.status === "PACKED").length,
      };
    });
  }

  const byUrgency = (u: string) => open.filter((o) => urgency(o.placedAt) === u);
  const groups: Record<string, typeof open> = {
    TODAY: open.filter((o) => urgency(o.placedAt) !== "LATER"),
    OVERDUE: byUrgency("OVERDUE"),
    PENDING: open.filter((o) => o.status === "PENDING"),
    PICKING: open.filter((o) => o.status === "PICKING"),
    PACKED: open.filter((o) => o.status === "PACKED"),
  };

  const orders =
    tab in groups
      ? groups[tab]
      : await db.order.findMany({
          where: { ...scope, ...search, ...(tab === "SHIPPED" ? { status: "SHIPPED" } : {}) },
          orderBy: tab === "SHIPPED" ? { shippedAt: "desc" } : { placedAt: "desc" },
          take: 200,
          include: { client: true, store: true, items: true },
        });

  const counts: Record<string, number> = {
    ...Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    SHIPPED: shippedCount,
    ALL: allCount,
  };

  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab, client, q, ...params })) if (v) sp.set(k, v);
    return `/salida?${sp.toString()}`;
  };

  const canAdvance = staff && ["TODAY", "OVERDUE", "PENDING", "PICKING", "PACKED"].includes(tab);
  const canPrint = staff && tab === "SHIPPED";

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Salida"
        description="Elige clientes y prepara sus pedidos uno a uno. Corte a las 14:00 en días laborables: lo que entra antes sale hoy."
      />

      {staff && <ClientBoard cards={cards} />}
      {staff && <h2 className="mb-4 text-lg font-semibold text-ink-900">Todos los pedidos</h2>}

      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <Tabs active={tab} tabs={TABS.map((t) => ({ ...t, href: href({ tab: t.key }), count: counts[t.key] }))} />
        {staff && (
          <form className="flex gap-2">
            <input type="hidden" name="tab" value={tab} />
            {q && <input type="hidden" name="q" value={q} />}
            <select name="client" defaultValue={client ?? ""} className="input w-56">
              <option value="">Todos los clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-ghost">Filtrar</button>
          </form>
        )}
      </div>

      {q && (
        <div className="mb-4 text-sm text-ink-500">
          Resultados para <b className="text-ink-900">«{q}»</b> · <Link href={href({ q: undefined })} className="text-brand-600 hover:underline">limpiar</Link>
        </div>
      )}

      <form>
        {(canAdvance || canPrint) && orders.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {canAdvance && tab !== "PACKED" && (
              <button formAction={advanceOrders} className="btn-ghost">
                <ArrowRightCircle className="h-4 w-4" /> Avanzar seleccionados
              </button>
            )}
            {canAdvance && (
              <button formAction={revertOrders} className="btn-ghost">
                <Undo2 className="h-4 w-4" /> Volver a pendiente
              </button>
            )}
            {canPrint && (
              <button formAction="/api/labels/batch" formMethod="get" formTarget="_blank" className="btn-ghost">
                <Printer className="h-4 w-4" /> Imprimir etiquetas seleccionadas
              </button>
            )}
            <span className="text-xs text-ink-400">
              {canAdvance ? "Avanzar: Sin preparar → Preparando → Embalado · Volver: deshace la preparación" : "Une las etiquetas en un solo PDF"}
            </span>
          </div>
        )}

        <Card className="overflow-hidden">
          {orders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line/70 bg-white/40">
                  <tr>
                    {(canAdvance || canPrint) && <th className="table-head w-10" />}
                    <th className="table-head">Pedido</th>
                    <th className="table-head">Cliente</th>
                    <th className="table-head">Destinatario</th>
                    <th className="table-head">Uds.</th>
                    <th className="table-head">{tab === "SHIPPED" ? "Enviado" : "Recibido"}</th>
                    <th className="table-head">{tab === "SHIPPED" ? "Seguimiento" : "Sale"}</th>
                    <th className="table-head">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {orders.map((o) => {
                    const open = OPEN.includes(o.status);
                    return (
                      <tr key={o.id} className={clsx("group transition hover:bg-brand-50/40", open && urgency(o.placedAt) === "OVERDUE" && "bg-rose-50/40")}>
                        {(canAdvance || canPrint) && (
                          <td className="cell">
                            {((canAdvance && open) ||
                              (canPrint && o.labelProvider && o.labelProvider !== "MANUAL")) && (
                              <input type="checkbox" name="ids" value={o.id} className="h-4 w-4 accent-brand-500" aria-label={`Seleccionar ${o.number}`} />
                            )}
                          </td>
                        )}
                        <td className="cell">
                          <Link href={`/salida/${o.id}`} className="mono font-semibold text-ink-900 group-hover:text-brand-600">{o.number}</Link>
                        </td>
                        <td className="cell">
                          <div className="font-medium text-ink-900">{o.client.name}</div>
                          <PlatformBadge platform={o.store.platform} />
                        </td>
                        <td className="cell text-ink-700">{o.customerName}</td>
                        <td className="cell mono text-ink-700">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td className="cell whitespace-nowrap text-ink-500">{formatDate(tab === "SHIPPED" && o.shippedAt ? o.shippedAt : o.placedAt)}</td>
                        <td className="cell whitespace-nowrap text-sm">
                          {o.status === "SHIPPED" ? (
                            <span className="mono text-ink-700">{o.carrier} · {o.trackingNumber}</span>
                          ) : open ? (
                            dueLabel(o.placedAt)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="cell">
                          <Link href={`/salida/${o.id}`}><StatusBadge status={o.status} /></Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Inbox} title={tab === "OVERDUE" ? "Nada retrasado" : "No hay pedidos aquí"}>
              {tab === "TODAY" ? "No queda nada por enviar hoy." : "Cuando una tienda conectada reciba un pedido pagado, aparecerá aquí."}
            </EmptyState>
          )}
        </Card>
      </form>
    </>
  );
}
