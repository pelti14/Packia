import { Contact, Download, Repeat, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, isStaff, requireUser } from "@/lib/auth";
import { ensureCustomersBackfilled } from "@/lib/customers";
import { customerWhere } from "@/lib/customers-query";
import { formatDateOnly, startOfMonth } from "@/lib/format";
import { Card, EmptyState, PageHeader, PlatformBadge, SearchBar, StatCard } from "@/components/ui";

const PAGE = 200;

export default async function ClientesTiendaPage({ searchParams }: { searchParams: Promise<{ client?: string; store?: string; q?: string }> }) {
  const filters = await searchParams;
  const user = await requireUser(["ADMIN", "STAFF"]);
  const staff = isStaff(user);

  // Primera vez tras actualizar: se rellena a partir de los pedidos que ya había.
  if (staff) await ensureCustomersBackfilled();

  const where = customerWhere(user, filters);
  const scope = clientScope(user);
  const [customers, total, repeat, fresh, clients, stores] = await Promise.all([
    db.storeCustomer.findMany({ where, include: { store: true, client: true }, orderBy: { lastOrderAt: "desc" }, take: PAGE }),
    db.storeCustomer.count({ where }),
    db.storeCustomer.count({ where: { ...where, ordersCount: { gt: 1 } } }),
    db.storeCustomer.count({ where: { ...where, firstOrderAt: { gte: startOfMonth() } } }),
    staff ? db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.store.findMany({ where: scope.clientId ? { clientId: scope.clientId } : filters.client ? { clientId: filters.client } : undefined, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Clientes tienda"
        description="Las personas que compran en cada tienda. Se guardan solas con cada pedido que entra."
        actions={
          <a href={`/api/export/clientes-tienda${exportQs ? `?${exportQs}` : ""}`} className="btn-primary">
            <Download className="h-4 w-4" /> Exportar ({total})
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Clientes" value={total.toLocaleString("es-ES")} hint="Con los filtros actuales" icon={Contact} tone="brand" />
        <StatCard label="Repiten" value={total ? `${Math.round((repeat / total) * 100)}%` : "0%"} hint={`${repeat} con más de un pedido`} icon={Repeat} tone="mint" />
        <StatCard label="Nuevos este mes" value={fresh} icon={UserPlus} tone="aqua" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar placeholder="Buscar nombre, email, teléfono, ciudad o C. P.…" defaultValue={filters.q} keep={{ client: filters.client, store: filters.store }} />
        <form className="flex flex-wrap gap-2">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {staff && (
            <select name="client" defaultValue={filters.client ?? ""} className="input w-48">
              <option value="">Todos los clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select name="store" defaultValue={filters.store ?? ""} className="input w-48">
            <option value="">Todas las tiendas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-ghost">Filtrar</button>
        </form>
      </div>

      <Card className="overflow-hidden">
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Contacto</th>
                  <th className="table-head">Localidad</th>
                  <th className="table-head">Tienda</th>
                  <th className="table-head">Pedidos</th>
                  <th className="table-head">Último pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {customers.map((c) => (
                  <tr key={c.id} className="transition hover:bg-brand-50/40">
                    <td className="cell">
                      <div className="font-medium text-ink-900">{c.name}</div>
                      {staff && <div className="text-xs text-ink-400">{c.client.name}</div>}
                    </td>
                    <td className="cell text-sm">
                      {c.email && <a href={`mailto:${c.email}`} className="block text-ink-700 hover:text-brand-600">{c.email}</a>}
                      {c.phone && <span className="mono text-xs text-ink-500">{c.phone}</span>}
                    </td>
                    <td className="cell text-ink-700">{[c.zip, c.city].filter(Boolean).join(" ")}<div className="text-xs text-ink-400">{c.country}</div></td>
                    <td className="cell"><div className="text-sm text-ink-700">{c.store.name}</div><PlatformBadge platform={c.store.platform} /></td>
                    <td className="cell mono font-semibold text-ink-900">{c.ordersCount}</td>
                    <td className="cell whitespace-nowrap text-ink-500">{formatDateOnly(c.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > PAGE && <p className="border-t border-line/70 px-5 py-3 text-xs text-ink-500">Mostrando los {PAGE} más recientes de {total}. Usa el buscador o exporta para verlos todos.</p>}
          </div>
        ) : (
          <EmptyState icon={Contact} title="Sin clientes todavía">Aparecerán aquí con cada pedido que entre de las tiendas.</EmptyState>
        )}
      </Card>
      <p className="mt-4 text-xs text-ink-400">Son datos personales de los clientes de cada tienda: úsalos solo para la logística de sus pedidos y no los compartas fuera de cada cliente.</p>
    </>
  );
}
