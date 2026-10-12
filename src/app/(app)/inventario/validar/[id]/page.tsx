import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { BackLink, Notice, PageHeader } from "@/components/ui";
import { ValidateForm } from "./validate-form";

export default async function ValidarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ next?: string }> }) {
  await requireUser(["ADMIN", "STAFF"]);
  const { id } = await params;
  const { next = "/inventario?tab=validar" } = await searchParams;
  const p = await db.product.findUnique({
    where: { id },
    select: { id: true, sku: true, name: true, barcode: true, location: true, weightGrams: true, stock: true, imageUrl: true, validatedAt: true, validatedBy: true, client: { select: { name: true } } },
  });
  if (!p) notFound();
  const pendingOrders = await db.order.count({ where: { status: { in: ["PENDING", "PICKING", "PACKED"] }, items: { some: { sku: p.sku } }, client: { products: { some: { id: p.id } } } } });

  return (
    <>
      <BackLink href={next}>Volver</BackLink>
      <PageHeader eyebrow={`Validar producto · ${p.client.name}`} title={p.name} description={<span className="mono">{p.sku}</span>} />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <div className="glass flex aspect-square items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-sm text-ink-400">Sin foto de la tienda</span>}
          </div>
          <div className="glass space-y-1 p-4 text-sm">
            <div><span className="text-ink-500">Stock:</span> <b className="mono">{p.stock}</b></div>
            <div><span className="text-ink-500">Pedidos abiertos con este producto:</span> <b className="mono">{pendingOrders}</b></div>
          </div>
          {p.validatedAt && <Notice tone="success">Validado {formatDate(p.validatedAt)}{p.validatedBy ? ` por ${p.validatedBy}` : ""}. Puedes volver a comprobarlo.</Notice>}
        </div>
        <div className="xl:col-span-2">
          <ValidateForm
            productId={p.id}
            next={next}
            initial={{ name: p.name, barcode: p.barcode ?? "", location: p.location ?? "", weightGrams: p.weightGrams ? String(p.weightGrams) : "" }}
          />
        </div>
      </div>
    </>
  );
}
