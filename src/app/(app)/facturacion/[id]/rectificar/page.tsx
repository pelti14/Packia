import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { invoicePeriodLabel } from "@/lib/billing";
import { BackLink, Notice, PageHeader } from "@/components/ui";
import { RectifyForm } from "./rectify-form";

export default async function RectificarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;
  const inv = await db.invoice.findUnique({ where: { id }, include: { client: true, lines: true } });
  if (!inv) notFound();
  if (inv.kind !== "INVOICE" || inv.status === "CANCELLED") redirect(`/facturacion/${id}`);
  return (
    <>
      <BackLink href={`/facturacion/${id}`}>Factura {inv.number}</BackLink>
      <PageHeader
        eyebrow={`${inv.client.name} · ${invoicePeriodLabel(inv)}`}
        title={`Corregir ${inv.number}`}
        description="Cambia, añade o quita líneas. Al guardar se anula la original con una rectificativa y se emite una factura nueva con estos importes, enlazadas entre sí."
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <RectifyForm
        invoiceId={inv.id}
        taxRate={inv.taxRate}
        lines={inv.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: (l.unitPriceCents / 100).toFixed(2).replace(".", ",") }))}
      />
    </>
  );
}
