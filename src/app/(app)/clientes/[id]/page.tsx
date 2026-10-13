import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/schedule";
import { billableFrom } from "@/lib/billing";
import { formatDateOnly } from "@/lib/format";
import { Notice } from "@/components/ui";
import { BackLink, PageHeader } from "@/components/ui";
import { ClientForm } from "./client-form";
import { ShippingForm } from "./shipping-form";
import { PlanPanel } from "./plan-panel";
import { applyDuePlanRequests, getPlans } from "@/lib/plans";
import { shippingOptionsFor } from "@/lib/labels";

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const { ok, error } = await searchParams;
  await applyDuePlanRequests();
  const c = await db.client.findUnique({ where: { id } });
  if (!c) notFound();
  const [shipping, plans] = await Promise.all([shippingOptionsFor(c), getPlans()]);
  return (
    <>
      <BackLink href="/clientes">Clientes</BackLink>
      <PageHeader eyebrow="Cliente" title={c.name} description="Estos importes se usan para calcular su factura mensual." actions={<Link href={`/mi-marca?c=${c.id}`} className="btn-ghost">Marca para sus compradores</Link>} />
      {ok && <div className="mb-4"><Notice tone="success">{ok}</Notice></div>}
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {billableFrom(c) > new Date() && (
        <div className="mb-6"><Notice>En periodo de prueba hasta el {formatDateOnly(new Date(billableFrom(c).getTime() - 86_400_000))}. Se empieza a facturar el {formatDateOnly(billableFrom(c))}.</Notice></div>
      )}
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
          serviceStartAt: dayKey(c.serviceStartAt ?? c.createdAt),
          trialWeeks: String(c.trialWeeks),
          planEffective: "today",
        }}
        plans={plans}
      />
      <PlanPanel clientId={c.id} />
      <div className="mt-6">
        <ShippingForm
          clientId={c.id}
          options={shipping.options}
          current={c.defaultShipping}
          ownSendcloud={Boolean(c.sendcloudPublicKey && c.sendcloudSecretKey)}
          strategy={c.shippingStrategy}
          markup={c.shippingMarkupCents === null ? "" : euros(c.shippingMarkupCents)}
          error={shipping.error}
        />
      </div>
    </>
  );
}
