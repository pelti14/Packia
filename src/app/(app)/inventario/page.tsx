import { Boxes, Layers, PackageX, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, isStaff, requireUser } from "@/lib/auth";
import { Card, EmptyState, PageHeader, SearchBar, StatCard, Tabs } from "@/components/ui";
import { ProductRow } from "./product-row";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ client?: string; q?: string; tab?: string }> }) {
  const { client, q, tab } = await searchParams;
  const toValidate = tab === "validar";
  const user = await requireUser();
  const staff = isStaff(user);
  const scope = {
    ...clientScope(user),
    ...(client && staff ? { clientId: client } : {}),
    ...(q && {
      OR: [
        { sku: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
        { location: { contains: q, mode: "insensitive" as const } },
        { barcode: { contains: q } },
        { client: { name: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
  };
  const [products, clients, pendingCount] = await Promise.all([
    db.product.findMany({
      where: { ...scope, ...(toValidate ? { validatedAt: null } : {}) },
      include: { client: true },
      orderBy: [{ client: { name: "asc" } }, { location: "asc" }],
    }),
    staff ? db.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.product.count({ where: { ...clientScope(user), validatedAt: null } }),
  ]);

  // Reservado = unidades de pedidos abiertos (pendientes, preparando o embalados) aún no enviados.
  const openItems = await db.orderItem.findMany({
    where: { order: { ...clientScope(user), status: { in: ["PENDING", "PICKING", "PACKED"] } } },
    select: { sku: true, quantity: true, order: { select: { clientId: true } } },
  });
  const reserved = new Map<string, number>();
  for (const i of openItems) reserved.set(`${i.order.clientId}|${i.sku}`, (reserved.get(`${i.order.clientId}|${i.sku}`) ?? 0) + i.quantity);
  const reservedOf = (p: { clientId: string; sku: string }) => reserved.get(`${p.clientId}|${p.sku}`) ?? 0;
  const short = products.filter((p) => p.stock - reservedOf(p) < 0).length;
  const units = products.reduce((s, p) => s + p.stock, 0);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;
  const out = products.filter((p) => p.stock <= 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Almacén"
        title="Inventario"
        description="Las referencias se importan de cada tienda. El stock sube con cada recepción y devolución, y baja con cada envío."
        actions={
          staff && <form className="flex gap-2">
            {q && <input type="hidden" name="q" value={q} />}
            <select name="client" defaultValue={client ?? ""} className="input w-56">
              <option value="">Todos los clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-ghost">Filtrar</button>
          </form>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {staff && (
          <Tabs
            active={toValidate ? "validar" : "todos"}
            tabs={[
              { key: "todos", label: "Todos", href: "/inventario" },
              { key: "validar", label: "Por validar", href: "/inventario?tab=validar", count: pendingCount, tone: "rose" as const },
            ]}
          />
        )}
        <SearchBar placeholder="Buscar producto, SKU, código de barras, ubicación o cliente…" defaultValue={q} keep={{ client, tab }} />
      </div>
      {staff && toValidate && pendingCount > 0 && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-amber-500/30">
          Productos nuevos que aún no tienen el OK. Mientras no se validen, los pedidos que los llevan <b>no se pueden embalar</b>.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Referencias" value={products.length} icon={Layers} tone="brand" />
        <StatCard label="Unidades en almacén" value={units.toLocaleString("es-ES")} icon={Boxes} tone="aqua" />
        <StatCard label="Stock bajo" value={low} icon={TriangleAlert} tone="amber" />
        <StatCard label="Agotados" value={out} hint={short ? `${short} con pedidos sin stock suficiente` : undefined} icon={PackageX} tone="amber" />
      </div>

      <Card className="overflow-hidden">
        {products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Producto</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Ubicación</th>
                  <th className="table-head">Stock <span className="font-normal normal-case tracking-normal text-ink-400">(físico · reservado · disponible)</span></th>
                  <th className="table-head">Peso</th>
                  {staff && <th className="table-head" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {products.map((p) => <ProductRow key={p.id} product={p} reserved={reservedOf(p)} clientName={p.client.name} editable={staff} validated={Boolean(p.validatedAt)} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Boxes} title="Sin productos">Conecta una tienda y sincroniza para importar su catálogo.</EmptyState>
        )}
      </Card>
    </>
  );
}
