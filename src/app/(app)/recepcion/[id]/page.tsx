import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessClient, isStaff, requireUser } from "@/lib/auth";
import { formatDate, formatDateOnly } from "@/lib/format";
import { BackLink, Card, CardHeader, Notice, PageHeader, Pill } from "@/components/ui";
import { ReceiveForm } from "./receive-form";

export default async function InboundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const inbound = await db.inbound.findUnique({ where: { id }, include: { client: true, items: true } });
  if (!inbound || !canAccessClient(user, inbound.clientId)) notFound();

  const products = await db.product.findMany({ where: { clientId: inbound.clientId, sku: { in: inbound.items.map((i) => i.sku) } } });
  const location = new Map(products.map((p) => [p.sku, p.location]));
  const expected = inbound.items.reduce((s, i) => s + i.expectedQty, 0);
  const received = inbound.items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);
  const damaged = inbound.items.reduce((s, i) => s + i.damagedQty, 0);

  return (
    <>
      <BackLink href="/recepcion">Recepción</BackLink>
      <PageHeader
        eyebrow={inbound.client.name}
        title={inbound.reference}
        description={[
          inbound.carrier,
          inbound.boxes && `${inbound.boxes} bultos`,
          inbound.expectedAt && `Llegada prevista ${formatDateOnly(inbound.expectedAt)}`,
          `Aviso creado ${formatDate(inbound.createdAt)}`,
        ].filter(Boolean).join(" · ")}
        actions={<Pill tone={inbound.status === "RECEIVED" ? "mint" : "aqua"}>{inbound.status === "RECEIVED" ? "Recibida" : "Prevista"}</Pill>}
      />

      {inbound.notes && <div className="mb-6"><Notice>{inbound.notes}</Notice></div>}

      <Card className="overflow-hidden">
        {inbound.status === "EXPECTED" && isStaff(user) ? (
          <>
            <CardHeader title="Contar y confirmar" subtitle={`${inbound.items.length} referencias · ${expected} unidades previstas`} />
            <ReceiveForm
              inboundId={inbound.id}
              items={inbound.items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, expectedQty: i.expectedQty, location: location.get(i.sku) ?? null }))}
            />
          </>
        ) : (
          <>
            <CardHeader
              title={inbound.status === "RECEIVED" ? "Recibido" : "Pendiente de llegar"}
              subtitle={
                inbound.status === "RECEIVED"
                  ? `${received} de ${expected} unidades · ${damaged} dañadas · ${inbound.receivedAt ? formatDate(inbound.receivedAt) : ""}`
                  : `${expected} unidades previstas`
              }
            />
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Producto</th>
                  <th className="table-head">Previstas</th>
                  <th className="table-head">Recibidas</th>
                  <th className="table-head">Dañadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {inbound.items.map((i) => {
                  const diff = i.receivedQty !== null && i.receivedQty !== i.expectedQty;
                  return (
                    <tr key={i.id}>
                      <td className="cell">
                        <div className="font-medium text-ink-900">{i.name}</div>
                        <div className="mono text-xs text-ink-400">{i.sku}</div>
                      </td>
                      <td className="cell mono">{i.expectedQty}</td>
                      <td className={diff ? "cell mono font-semibold text-amber-600" : "cell mono"}>{i.receivedQty ?? "—"}</td>
                      <td className={i.damagedQty ? "cell mono font-semibold text-rose-500" : "cell mono"}>{i.receivedQty === null ? "—" : i.damagedQty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </>
  );
}
