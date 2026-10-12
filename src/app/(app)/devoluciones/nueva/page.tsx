import { db } from "@/lib/db";
import { clientScope, requireUser } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/schedule";
import { BackLink, PageHeader } from "@/components/ui";
import { ReturnForm } from "./return-form";

export default async function NewReturnPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { ...clientScope(user), status: "SHIPPED", shippedAt: { gte: addDays(startOfDay(), -120) } },
    include: { client: true, items: true },
    orderBy: { shippedAt: "desc" },
    take: 500,
  });
  return (
    <>
      <BackLink href="/devoluciones">Devoluciones</BackLink>
      <PageHeader eyebrow="Devoluciones" title="Registrar devolución" description="Anuncia un paquete que va a volver al almacén. Al llegar se revisa cada unidad." />
      <ReturnForm
        defaultOrderId={orders.some((o) => o.id === order) ? order : undefined}
        orders={orders.map((o) => ({
          id: o.id,
          number: o.number,
          customerName: o.customerName,
          clientName: o.client.name,
          items: o.items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, quantity: i.quantity })),
        }))}
      />
    </>
  );
}
