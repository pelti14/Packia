import Link from "next/link";
import { AlertCircle, CheckCircle2, Plug, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { Card, EmptyState, PageHeader, PlatformBadge } from "@/components/ui";
import { SyncButton } from "./sync-button";

export default async function StoresPage() {
  const stores = await db.store.findMany({
    orderBy: { createdAt: "asc" },
    include: { client: true, _count: { select: { orders: true, products: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Integraciones"
        title="Tiendas conectadas"
        description="Cada tienda envía sus pedidos pagados a Packia al instante mediante webhooks. La sincronización manual recupera los pendientes."
        actions={<Link href="/tiendas/nueva" className="btn-primary"><Plus className="h-4 w-4" /> Conectar tienda</Link>}
      />

      {stores.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {stores.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <Link href={`/tiendas/${s.id}`} className="group min-w-0">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={s.platform} size="md" />
                    {s.isDemo && <span className="rounded-md bg-line/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-500">Demo</span>}
                  </div>
                  <div className="mt-3 truncate text-lg font-semibold text-ink-900 group-hover:text-brand-600">{s.name}</div>
                  <div className="mono truncate text-xs text-ink-400">{s.domain}</div>
                </Link>
                <SyncButton storeId={s.id} showResult={false} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line/70 pt-4 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-400">Cliente</div>
                  <div className="truncate font-medium text-ink-900">{s.client.name}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-400">Pedidos</div>
                  <div className="mono font-medium text-ink-900">{s._count.orders}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-400">Estado</div>
                  {s.lastSyncError ? (
                    <div className="flex items-center gap-1 font-medium text-rose-500"><AlertCircle className="h-3.5 w-3.5" /> Error</div>
                  ) : (
                    <div className="flex items-center gap-1 font-medium text-mint-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s.lastSyncAt ? timeAgo(s.lastSyncAt) : "Conectada"}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={Plug} title="Ninguna tienda conectada">
            Conecta la tienda Shopify o WooCommerce de tu primer cliente y sus pedidos empezarán a llegar solos.
          </EmptyState>
        </Card>
      )}
    </>
  );
}
