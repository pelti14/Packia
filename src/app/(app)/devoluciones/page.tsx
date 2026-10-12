import Link from "next/link";
import { Plus, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { clientScope, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { RETURN_STATUS_LABEL } from "@/lib/types";
import { Card, EmptyState, PageHeader, Pill, Tabs } from "@/components/ui";

const STATUSES = ["ANNOUNCED", "RECEIVED", "PROCESSED"] as const;
const TONE = { ANNOUNCED: "amber", RECEIVED: "aqua", PROCESSED: "mint" } as const;

export default async function DevolucionesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams;
  const tab = STATUSES.find((s) => s === t) ?? "ANNOUNCED";
  const user = await requireUser();
  const scope = clientScope(user);

  const [returns, counts] = await Promise.all([
    db.return.findMany({
      where: { ...scope, status: tab },
      include: { client: true, order: true, items: true },
      orderBy: tab === "PROCESSED" ? { processedAt: "desc" } : { createdAt: "asc" },
      take: 200,
    }),
    db.return.groupBy({ by: ["status"], where: scope, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Devoluciones"
        description="Paquetes que vuelven de los clientes finales. Se revisan al llegar: lo vendible vuelve al stock y lo dañado se aparta."
        actions={<Link href="/devoluciones/nueva" className="btn-primary"><Plus className="h-4 w-4" /> Registrar devolución</Link>}
      />

      <div className="mb-4">
        <Tabs
          active={tab}
          tabs={STATUSES.map((s) => ({ key: s, label: s === "ANNOUNCED" ? "Anunciadas" : s === "RECEIVED" ? "Por revisar" : "Procesadas", href: `/devoluciones?tab=${s}`, count: count(s) }))}
        />
      </div>

      <Card className="overflow-hidden">
        {returns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line/70 bg-white/40">
                <tr>
                  <th className="table-head">Pedido</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Destinatario</th>
                  <th className="table-head">Uds.</th>
                  <th className="table-head">Motivo</th>
                  <th className="table-head">Fecha</th>
                  <th className="table-head">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {returns.map((r) => (
                  <tr key={r.id} className="group transition hover:bg-brand-50/40">
                    <td className="cell">
                      <Link href={`/devoluciones/${r.id}`} className="mono font-semibold text-ink-900 group-hover:text-brand-600">{r.order?.number ?? "Sin pedido"}</Link>
                    </td>
                    <td className="cell text-ink-700">{r.client.name}</td>
                    <td className="cell text-ink-700">{r.order?.customerName ?? "—"}</td>
                    <td className="cell mono text-ink-700">{r.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="cell max-w-56 truncate text-ink-500">{r.reason ?? "—"}</td>
                    <td className="cell whitespace-nowrap text-ink-500">{formatDate(r.processedAt ?? r.receivedAt ?? r.createdAt)}</td>
                    <td className="cell"><Pill tone={TONE[r.status as keyof typeof TONE]}>{RETURN_STATUS_LABEL[r.status as keyof typeof RETURN_STATUS_LABEL]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={RotateCcw} title="Nada por aquí">No hay devoluciones en este estado.</EmptyState>
        )}
      </Card>
    </>
  );
}
