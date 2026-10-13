import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, PackagePlus, Palette, Plug, ShoppingBag, Store, Truck } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { shopifyOAuthConfigured } from "@/lib/onboarding";
import { Card, Notice, PageHeader, PlatformBadge } from "@/components/ui";

export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; woo?: string; success?: string }> }) {
  const user = await requireUser();
  if (user.role !== "CLIENT") redirect("/clientes");
  if (!user.clientId) redirect("/");
  const { ok, error, woo, success } = await searchParams;
  const clientId = user.clientId;
  const [client, stores, products, inbounds, shipped, settings] = await Promise.all([
    db.client.findUniqueOrThrow({ where: { id: clientId } }),
    db.store.findMany({ where: { clientId }, select: { id: true, name: true, platform: true, domain: true, lastSyncAt: true, lastSyncError: true } }),
    db.product.count({ where: { clientId } }),
    db.inbound.count({ where: { clientId } }),
    db.order.count({ where: { clientId, status: "SHIPPED" } }),
    getSettings(),
  ]);
  const steps = [
    { done: stores.length > 0, title: "Conecta tu tienda", icon: Plug },
    { done: products > 0, title: "Tu catálogo, importado", icon: ShoppingBag },
    { done: inbounds > 0, title: "Avísanos de tu primer envío de stock", icon: PackagePlus },
    { done: client.trackingEnabled || Boolean(client.publicLogo), title: "Tu marca para tus compradores", icon: Palette },
    { done: shipped > 0, title: "Primer pedido enviado", icon: Truck },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const s = settings.sender;

  return (
    <>
      <PageHeader eyebrow="Primeros pasos" title={doneCount === steps.length ? "¡Todo listo!" : `Bienvenido, ${client.name}`} description={`Llevas ${doneCount} de ${steps.length} pasos. En cuanto conectes tu tienda y llegue tu stock, empezamos a enviar tus pedidos.`} />
      {ok && <div className="mb-4"><Notice tone="success">{ok}</Notice></div>}
      {woo && success !== "0" && <div className="mb-4"><Notice tone="success">¡WooCommerce conectado! Estamos importando tu catálogo y tus pedidos.</Notice></div>}
      {(error || (woo && success === "0")) && <div className="mb-4"><Notice tone="error">{error ?? "No se completó la conexión con WooCommerce. Vuelve a intentarlo."}</Notice></div>}

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-line/70">
        <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <div className="space-y-4">
        <Step n={1} {...steps[0]}>
          {stores.length > 0 && (
            <ul className="mb-4 space-y-2">
              {stores.map((st) => (
                <li key={st.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-ink-400" /> <b>{st.name}</b> <PlatformBadge platform={st.platform} />
                  <span className="text-ink-500">{st.lastSyncError ? <span className="text-rose-500">{st.lastSyncError}</span> : st.lastSyncAt ? "Sincronizada" : "Importando…"}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <form action="/api/shopify/install" method="get" className="rounded-xl bg-white/70 p-4 ring-1 ring-line">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink-900"><PlatformBadge platform="SHOPIFY" size="md" /> Shopify</div>
              {shopifyOAuthConfigured() ? (
                <>
                  <label className="label" htmlFor="shop">Tu tienda</label>
                  <input id="shop" name="shop" className="input" placeholder="mitienda.myshopify.com" required />
                  <button className="btn-primary mt-3 w-full">Conectar con Shopify</button>
                  <p className="mt-2 text-xs text-ink-400">Te llevamos a Shopify, pulsas «Instalar» y vuelves aquí. Sin copiar claves.</p>
                </>
              ) : (
                <p className="text-sm text-ink-500">Te la conectamos nosotros en unos minutos: escríbenos{settings.company.email ? <> a <a className="font-semibold text-brand-600" href={`mailto:${settings.company.email}`}>{settings.company.email}</a></> : null}.</p>
              )}
            </form>
            <form action="/api/woocommerce/connect" method="get" className="rounded-xl bg-white/70 p-4 ring-1 ring-line">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink-900"><PlatformBadge platform="WOOCOMMERCE" size="md" /> WooCommerce</div>
              <label className="label" htmlFor="url">Dirección de tu tienda</label>
              <input id="url" name="url" className="input" placeholder="https://mitienda.com" required />
              <button className="btn-primary mt-3 w-full">Conectar con WooCommerce</button>
              <p className="mt-2 text-xs text-ink-400">Entra en tu WordPress, pulsa «Aprobar» y vuelves aquí. Sin copiar claves.</p>
            </form>
          </div>
        </Step>

        <Step n={2} {...steps[1]}>
          <p className="text-sm text-ink-500">{products > 0 ? `${products} referencias importadas. Nuestro equipo comprobará cada una (código de barras y ubicación) cuando llegue al almacén.` : "Se importa solo al conectar la tienda."}</p>
        </Step>

        <Step n={3} {...steps[2]}>
          <p className="mb-3 text-sm text-ink-500">Dinos qué nos mandas (referencias y unidades) para recibirlo y colocarlo en cuanto llegue. Dirección del almacén:</p>
          <div className="mb-3 rounded-xl bg-white/70 p-3 text-sm ring-1 ring-line">
            <b>{s.name}</b><br />{s.address}{s.zip || s.city ? `, ${s.zip} ${s.city}` : ""}{s.phone ? ` · Tel. ${s.phone}` : ""}
          </div>
          <Link href="/recepcion/nueva" className="btn-ghost">Avisar de un envío de stock</Link>
        </Step>

        <Step n={4} {...steps[3]}>
          <p className="mb-3 text-sm text-ink-500">Tus compradores verán tu logo y tus colores en la página de seguimiento y en los emails de «pedido enviado».</p>
          <Link href="/mi-marca" className="btn-ghost">Configurar mi marca</Link>
        </Step>

        <Step n={5} {...steps[4]}>
          <p className="text-sm text-ink-500">{shipped > 0 ? `Ya hemos enviado ${shipped} pedidos tuyos.` : "Tus pedidos aparecerán en Salida en cuanto entren en tu tienda."}</p>
        </Step>
      </div>
    </>
  );
}

function Step({ n, done, title, icon: Icon, children }: { n: number; done: boolean; title: string; icon: typeof Plug; children: React.ReactNode }) {
  return (
    <Card className={clsx("p-5", done && "opacity-90")}>
      <div className="mb-3 flex items-center gap-3">
        <span className={clsx("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold", done ? "bg-brand-400 text-ink-900" : "bg-ink-900 text-white")}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <Icon className="h-4 w-4 text-ink-400" />
        <h2 className="font-semibold text-ink-900">{title}</h2>
      </div>
      {children}
    </Card>
  );
}
