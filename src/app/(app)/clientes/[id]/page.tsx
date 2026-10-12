import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BackLink, PageHeader } from "@/components/ui";
import { ClientForm } from "./client-form";

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const c = await db.client.findUnique({ where: { id } });
  if (!c) notFound();
  return (
    <>
      <BackLink href="/clientes">Clientes</BackLink>
      <PageHeader eyebrow="Cliente" title={c.name} description="Estos importes se usan para calcular su factura mensual." />
      <ClientForm
        clientId={c.id}
        initial={{
          name: c.name,
          contactEmail: c.contactEmail ?? "",
          taxId: c.taxId ?? "",
          billingAddress: c.billingAddress ?? "",
          plan: c.plan,
          planOrders: String(c.planOrders),
          monthlyFee: euros(c.monthlyFeeCents),
          extraOrderFee: euros(c.extraOrderFeeCents),
          returnFee: euros(c.returnFeeCents),
        }}
      />
    </>
  );
}
