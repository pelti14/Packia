import Link from "next/link";
import { PackagePlus, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, requireUser } from "@/lib/auth";
import { formatDate, formatDateOnly } from "@/lib/format";
import { INBOUND_STATUS_LABEL } from "@/lib/types";
import { Card, EmptyState, PageHeader, Pill, Tabs } from "@/components/ui";

export default async function RecepcionPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams;
  const tab = t === "RECEIVED" ? "RECEIVED" : "EXPECTED";
  const user = await requireUser();
  const scope = clientScope(user);

  const [inbounds, counts] = await Promise.all([
    db.inbound.findMany({
      where: { ...scope, status: tab },
      include: { client: true, items: true },
      orderBy: tab === "EXPECTED" ? [{ expectedAt: "asc" }, { createdAt: "asc" }] : { receivedAt: "desc" },
      take: 200,
    }),
    db.inbound.groupBy({ by: ["status"], where: scope, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Recepción"
        description="Mercancía que los clientes envían al almacén. Se avisa antes, se cuenta al llegar y entra en el stock al confirmar."
        actions={<Link href="/recepcion/nueva" className="btn-primary"><Plus className="h-4 w-4" /> Nuevo aviso de entrada</Link>}
      />

      <div className="mb-4">
        <Tabs
          active={tab}
          tabs={[
            { key: "EXPECTED", label: "Previstas", href: "/recepcion?tab=EXPECTED", count: count("EXPECTED") },
            { key: "RECEIVED", label: "Recibidas", href: "/recepcion?tab=RECEIVED", count: count("RECEIVED") },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {inbounds.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Referencia</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Refs.</th>
                  <th className="table-head">Unidades</th>
                  <th className="table-head">{tab === "EXPECTED" ? "Llegada prevista" : "Recibida"}</th>
                  <th className="table-head">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {inbounds.map((r) => {
                  const expected = r.items.reduce((s, i) => s + i.expectedQty, 0);
                  const received = r.items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);
                  const diff = r.status === "RECEIVED" && received !== expected;
                  return (
                    <tr key={r.id} className="group transition hover:bg-brand-50/40">
                      <td className="cell">
                        <Link href={`/recepcion/${r.id}`} className="font-semibold text-ink-900 group-hover:text-brand-600">{r.reference}</Link>
                        {r.carrier && <div className="text-xs text-ink-400">{r.carrier}{r.boxes ? ` · ${r.boxes} bultos` : ""}</div>}
                      </td>
                      <td className="cell text-ink-700">{r.client.name}</td>
                      <td className="cell mono text-ink-700">{r.items.length}</td>
                      <td className="cell mono text-ink-700">
                        {r.status === "RECEIVED" ? <>{received} <span className="text-ink-400">/ {expected}</span></> : expected}
                      </td>
                      <td className="cell whitespace-nowrap text-ink-500">
                        {r.status === "RECEIVED" && r.receivedAt ? formatDate(r.receivedAt) : r.expectedAt ? formatDateOnly(r.expectedAt) : "Sin fecha"}
                      </td>
                      <td className="cell">
                        <Pill tone={r.status === "RECEIVED" ? (diff ? "amber" : "mint") : "aqua"}>
                          {diff ? "Con diferencias" : INBOUND_STATUS_LABEL[r.status as keyof typeof INBOUND_STATUS_LABEL]}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={PackagePlus} title={tab === "EXPECTED" ? "No hay entradas previstas" : "Aún no hay recepciones"}>
            Crea un aviso con las referencias y cantidades que van a llegar.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
