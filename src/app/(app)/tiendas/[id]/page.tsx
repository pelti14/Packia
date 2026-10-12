import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppUrl } from "@/lib/app-url";
import { Webhook } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { formatDate } from "@/lib/format";
import { BackLink, Card, CardHeader, Notice, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";
import { SyncButton } from "../sync-button";
import { CopyField } from "./copy-field";
import { WebhooksButton } from "./webhooks-button";


export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["ADMIN", "STAFF"]);
  const { id } = await params;
  const store = await db.store.findUnique({
    where: { id },
    include: { client: true, orders: { orderBy: { placedAt: "desc" }, take: 8 }, _count: { select: { products: true, orders: true } } },
  });
  if (!store) notFound();

  const base = await getAppUrl();
  const shopify = store.platform === "SHOPIFY";
  const webhookUrl = `${base}/api/webhooks/${shopify ? "shopify" : "woocommerce"}`;

  return (
    <>
      <BackLink href="/tiendas">Tiendas</BackLink>
      <PageHeader
        eyebrow={store.client.name}
        title={store.name}
        description={<span className="mono">{store.domain}</span>}
        actions={<SyncButton storeId={store.id} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PlatformBadge platform={store.platform} size="md" />
        {shopify && !store.isDemo && (
          <span className="rounded-lg bg-line/60 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
            {store.shopifyClientId ? "App Dev Dashboard" : "App antigua"}
          </span>
        )}
        <span className="text-sm text-ink-500">{store._count.products} referencias · {store._count.orders} pedidos</span>
        {store.lastSyncAt && <span className="text-sm text-ink-400">· Última sincronización {formatDate(store.lastSyncAt)}</span>}
      </div>

      {store.lastSyncError && <div className="mb-6"><Notice tone="error">Último error: {store.lastSyncError}</Notice></div>}
      {store.isDemo && <div className="mb-6"><Notice>Tienda de demostración: no se conecta a ninguna API real.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Webhooks · pedidos en tiempo real" subtitle="Así cada pedido pagado entra en la cola al instante" action={<Webhook className="h-5 w-5 text-brand-500" />} />
          <div className="space-y-5 px-5 py-5">
            <CopyField label="URL de entrega" value={webhookUrl} />
            {!shopify && store.webhookSecret && user.role === "ADMIN" && <CopyField label="Secreto" value={decrypt(store.webhookSecret) ?? ""} />}
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700 marker:font-semibold marker:text-brand-500">
              {shopify ? (
                <>
                  <li>Packia crea automáticamente en Shopify los webhooks de <b>pedido creado</b> y <b>pedido cancelado</b> al conectar la tienda.</li>
                  <li>Si cambias de dominio o has borrado los webhooks, pulsa el botón de abajo para crearlos de nuevo.</li>
                  <li>Cada aviso llega firmado con la clave secreta de la app y Packia lo verifica.</li>
                </>
              ) : (
                <>
                  <li>WooCommerce → Ajustes → Avanzado → Webhooks → Añadir webhook.</li>
                  <li>Crea uno con tema <b>Pedido creado</b> y otro con <b>Pedido actualizado</b>, estado Activo, la URL y el secreto de arriba.</li>
                  <li>Versión de la API: WP REST API Integration v3.</li>
                </>
              )}
            </ol>
            {shopify && !store.isDemo && user.role === "ADMIN" && <WebhooksButton storeId={store.id} />}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Últimos pedidos" />
          <ul className="divide-y divide-line/60">
            {store.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/salida/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40">
                  <span className="mono w-16 font-semibold text-ink-900">{o.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{o.customerName}</span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
            {!store.orders.length && <li className="px-5 py-6 text-sm text-ink-500">Sin pedidos todavía.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
