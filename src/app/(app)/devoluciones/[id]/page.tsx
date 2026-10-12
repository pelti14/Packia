import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { canAccessClient, isStaff, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { RETURN_STATUS_LABEL } from "@/lib/types";
import { BackLink, Card, CardHeader, Notice, PageHeader, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { markReturnReceived } from "../actions";
import { ProcessForm } from "./process-form";

const TONE = { ANNOUNCED: "amber", RECEIVED: "aqua", PROCESSED: "mint" } as const;

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ret = await db.return.findUnique({ where: { id }, include: { client: true, order: true, items: true } });
  if (!ret || !canAccessClient(user, ret.clientId)) notFound();
  const staff = isStaff(user);
  const status = ret.status as keyof typeof TONE;

  return (
    <>
      <BackLink href="/devoluciones">Devoluciones</BackLink>
      <PageHeader
        eyebrow={ret.client.name}
        title={<>Devolución {ret.order && <Link href={`/salida/${ret.order.id}`} className="mono text-gradient">{ret.order.number}</Link>}</>}
        description={[ret.order?.customerName, ret.reason, `Registrada ${formatDate(ret.createdAt)}`].filter(Boolean).join(" · ")}
        actions={<Pill tone={TONE[status]}>{RETURN_STATUS_LABEL[status]}</Pill>}
      />

      {staff && status === "ANNOUNCED" && (
        <div className="mb-6">
          <Notice>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Cuando llegue el paquete, márcalo como recibido o procésalo directamente.</span>
              <form action={markReturnReceived.bind(null, ret.id)}>
                <SubmitButton variant="ghost"><PackageCheck className="h-4 w-4" /> Marcar recibida</SubmitButton>
              </form>
            </div>
          </Notice>
        </div>
      )}

      <Card className="overflow-hidden">
        {staff && status !== "PROCESSED" ? (
          <>
            <CardHeader title="Revisar productos" subtitle="Decide qué vuelve a la venta" />
            <ProcessForm returnId={ret.id} items={ret.items} />
          </>
        ) : (
          <>
            <CardHeader title="Productos" subtitle={ret.processedAt ? `Procesada ${formatDate(ret.processedAt)}` : "Pendiente de revisión en el almacén"} />
            <ul className="divide-y divide-line/60">
              {ret.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-900">{i.name}</div>
                    <div className="mono text-xs text-ink-400">{i.sku} · ×{i.quantity}</div>
                  </div>
                  {i.condition === "RESTOCK" && <Pill tone="mint">Vuelve a stock</Pill>}
                  {i.condition === "DAMAGED" && <Pill tone="rose">Dañado</Pill>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
