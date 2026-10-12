import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { Check, ExternalLink, MapPin, PackageOpen, Printer, RotateCcw, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { canAccessClient, isStaff, requireUser } from "@/lib/auth";
import { packOrder, revertOrder } from "@/app/actions";
import { estimateWeight, shippingOptionsFor } from "@/lib/labels";
import { formatDate, parseAddress } from "@/lib/format";
import { urgency } from "@/lib/schedule";
import { ORDER_FLOW, STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { BackLink, Card, CardHeader, Notice, PlatformBadge, Pill, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ShipForm } from "./ship-form";
import { PickList } from "@/components/pick-list";
import { BlockersNotice } from "@/components/blockers-notice";
import { orderBlockers } from "@/lib/validation";


export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await db.order.findUnique({ where: { id }, include: { client: true, store: true, items: true, returns: true } });
  if (!order || !canAccessClient(user, order.clientId)) notFound();
  const staff = isStaff(user);

  const products = await db.product.findMany({ where: { clientId: order.clientId, sku: { in: order.items.map((i) => i.sku) } } });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const address = parseAddress(order.shippingAddress);
  const status = order.status as OrderStatus;
  const step = ORDER_FLOW.indexOf(status);
  const units = order.items.reduce((s, i) => s + i.quantity, 0);
  const open = ["PENDING", "PICKING", "PACKED"].includes(status);
  const u = urgency(order.placedAt);

  const shipping = staff && status === "PACKED" ? await shippingOptionsFor(order.client) : null;
  const blockers = staff && open ? await orderBlockers(order) : [];

  return (
    <>
      <BackLink href="/salida">Salida</BackLink>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mono text-3xl font-bold text-ink-900">{order.number}</h1>
            <StatusBadge status={order.status} />
            {open && u === "OVERDUE" && <Pill tone="rose">Retrasado</Pill>}
            {open && u === "TODAY" && <Pill tone="brand">Sale hoy</Pill>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span className="font-medium text-ink-700">{order.client.name}</span>·<PlatformBadge platform={order.store.platform} />·
            <span>Recibido {formatDate(order.placedAt)}</span>
          </div>
        </div>
      </div>

      {status !== "CANCELLED" && (
        <Card className="mb-6 px-6 py-5">
          <ol className="flex items-center">
            {ORDER_FLOW.map((s, i) => {
              const done = i < step || status === "SHIPPED";
              const current = i === step && status !== "SHIPPED";
              return (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition",
                        done && "bg-brand-400 text-ink-900 shadow-[var(--shadow-glow)]",
                        current && "bg-white text-brand-600 ring-2 ring-brand-500",
                        !done && !current && "bg-line/60 text-ink-400",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={clsx("hidden text-sm font-medium sm:block", done || current ? "text-ink-900" : "text-ink-400")}>
                      {s === "PACKED" ? "Embalado" : STATUS_LABEL[s]}
                    </span>
                  </div>
                  {i < ORDER_FLOW.length - 1 && (
                    <div className={clsx("mx-3 h-0.5 flex-1 rounded-full", i < step || status === "SHIPPED" ? "bg-gradient-to-r from-brand-500 to-aqua-400" : "bg-line")} />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Lista de picking" subtitle={`${order.items.length} líneas · ${units} unidades · ordenadas por ubicación${staff && open ? " · toca cada producto al cogerlo" : ""}`} />
          <PickList
            orderId={order.id}
            interactive={staff && open}
            showStock={open}
            items={[...order.items]
              .sort((a, b) => (bySku.get(a.sku)?.location ?? "ZZ").localeCompare(bySku.get(b.sku)?.location ?? "ZZ"))
              .map((i) => ({ id: i.id, sku: i.sku, name: i.name, quantity: i.quantity, location: bySku.get(i.sku)?.location ?? null, stock: bySku.get(i.sku)?.stock ?? null, barcode: bySku.get(i.sku)?.barcode ?? null }))}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Envío" />
            <div className="space-y-4 px-5 py-5">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div className="text-sm leading-relaxed text-ink-700">
                  <div className="font-semibold text-ink-900">{address.name || order.customerName}</div>
                  <div>{address.address1}</div>
                  {address.address2 && <div>{address.address2}</div>}
                  <div>{address.zip} {address.city}{address.province ? `, ${address.province}` : ""}</div>
                  <div>{address.country}</div>
                  {address.phone && <div className="mono mt-1 text-ink-500">{address.phone}</div>}
                </div>
              </div>

              {status === "SHIPPED" ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-mint-50 p-4 ring-1 ring-mint-500/20">
                    <div className="flex items-center gap-2 text-sm font-semibold text-mint-600"><Truck className="h-4 w-4" /> {order.carrier}</div>
                    <div className="mono mt-1 text-ink-900">{order.trackingNumber}</div>
                    {order.shippedAt && <div className="mt-1 text-xs text-ink-500">Enviado {formatDate(order.shippedAt)}{order.weightGrams ? ` · ${order.weightGrams} g` : ""}</div>}
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                        Seguimiento <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {order.labelProvider && order.labelProvider !== "MANUAL" && (
                    <>
                      {staff && (
                        <div className={order.labelPrintedAt ? "text-xs text-mint-600" : "text-xs font-semibold text-amber-600"}>
                          {order.labelPrintedAt ? `Etiqueta impresa ${formatDate(order.labelPrintedAt)}` : <>Etiqueta en <Link href="/etiquetas" className="underline">Por imprimir</Link></>}
                        </div>
                      )}
                      <a href={`/api/labels/${order.id}`} target="_blank" className="btn-primary w-full">
                        <Printer className="h-4 w-4" /> {order.labelPrintedAt ? "Reimprimir etiqueta" : "Imprimir etiqueta"}
                      </a>
                    </>
                  )}
                  <Link href={`/devoluciones/nueva?order=${order.id}`} className="btn-ghost w-full">
                    <RotateCcw className="h-4 w-4" /> Registrar devolución
                  </Link>
                </div>
              ) : !staff ? (
                <Notice>{status === "CANCELLED" ? "Pedido cancelado en la tienda." : "En preparación en el almacén."}</Notice>
              ) : null}

              {staff && <BlockersNotice blockers={blockers} returnTo={`/salida/${order.id}`} />}

              {status === "SHIPPED" || !staff ? null : status === "PACKED" ? (
                blockers.length ? null : <>
                  {shipping?.error && <Notice tone="error">Sendcloud no disponible: {shipping.error}</Notice>}
                  <ShipForm orderId={order.id} weightGrams={await estimateWeight(order)} options={shipping!.options} defaultValue={shipping!.defaultValue} />
                </>
              ) : status !== "CANCELLED" ? (
                blockers.length ? null : (
                  <form action={async () => { "use server"; await packOrder(order.id); }}>
                    <SubmitButton className="w-full"><PackageOpen className="h-4 w-4" /> Marcar como embalado</SubmitButton>
                  </form>
                )
              ) : (
                <Notice tone="error">Pedido cancelado en la tienda. No preparar.</Notice>
              )}

              {staff && (status === "PICKING" || status === "PACKED") && (
                <form action={revertOrder.bind(null, order.id)}>
                  <SubmitButton variant="ghost" className="w-full">↺ Volver a pendiente (deshacer preparación)</SubmitButton>
                </form>
              )}

              {order.syncError && <Notice tone="error">No se pudo avisar a la tienda: {order.syncError}</Notice>}
            </div>
          </Card>

          {order.returns.length > 0 && (
            <Card className="px-5 py-4">
              <div className="label">Devoluciones</div>
              {order.returns.map((r) => (
                <Link key={r.id} href={`/devoluciones/${r.id}`} className="block text-sm font-medium text-brand-600 hover:underline">
                  Devolución del {formatDate(r.createdAt)}
                </Link>
              ))}
            </Card>
          )}

          {order.email && (
            <Card className="px-5 py-4 text-sm">
              <div className="label">Email del cliente final</div>
              <div className="text-ink-700">{order.email}</div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
