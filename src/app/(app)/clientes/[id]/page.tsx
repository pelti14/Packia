import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BackLink, PageHeader } from "@/components/ui";
import { ClientForm } from "./client-form";
import { ShippingForm } from "./shipping-form";
import { shippingOptionsFor } from "@/lib/labels";

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const c = await db.client.findUnique({ where: { id } });
  if (!c) notFound();
  const shipping = await shippingOptionsFor(c);
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
      <div className="mt-6">
        <ShippingForm
          clientId={c.id}
          options={shipping.options}
          current={c.defaultShipping}
          ownSendcloud={Boolean(c.sendcloudPublicKey && c.sendcloudSecretKey)}
          error={shipping.error}
        />
      </div>
    </>
  );
}
