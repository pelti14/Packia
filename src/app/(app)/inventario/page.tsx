import { Boxes, Layers, PackageX, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, isStaff, requireUser } from "@/lib/auth";
import { Card, EmptyState, PageHeader, SearchBar, StatCard } from "@/components/ui";
import { ProductRow } from "./product-row";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ client?: string; q?: string }> }) {
  const { client, q } = await searchParams;
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
        { client: { name: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
  };
  const [products, clients] = await Promise.all([
    db.product.findMany({
      where: scope,
      include: { client: true },
      orderBy: [{ client: { name: "asc" } }, { location: "asc" }],
    }),
    staff ? db.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

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

      <div className="mb-4">
        <SearchBar placeholder="Buscar producto, SKU, ubicación o cliente…" defaultValue={q} keep={{ client }} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Referencias" value={products.length} icon={Layers} tone="brand" />
        <StatCard label="Unidades en almacén" value={units.toLocaleString("es-ES")} icon={Boxes} tone="aqua" />
        <StatCard label="Stock bajo" value={low} icon={TriangleAlert} tone="amber" />
        <StatCard label="Agotados" value={out} icon={PackageX} tone="amber" />
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
                  <th className="table-head">Stock</th>
                  <th className="table-head">Peso</th>
                  {staff && <th className="table-head" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {products.map((p) => <ProductRow key={p.id} product={p} clientName={p.client.name} editable={staff} />)}
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
