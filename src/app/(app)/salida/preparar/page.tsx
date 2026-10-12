import { getPrintSettings } from "@/lib/labels/print";
import Link from "next/link";
import { CheckCircle2, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { estimateWeight, shippingOptionsFor } from "@/lib/labels";
import { parseAddress } from "@/lib/format";
import { urgency } from "@/lib/schedule";
import { BackLink, Card, Notice, PageHeader } from "@/components/ui";
import { Station } from "./station";
import { BlockersNotice } from "@/components/blockers-notice";
import { orderBlockers } from "@/lib/validation";

const RANK = { OVERDUE: 0, TODAY: 1, LATER: 2 } as const;

export default async function PrepararPage({ searchParams }: { searchParams: Promise<{ clients?: string; hoy?: string; o?: string; etiqueta?: string }> }) {
  await requireUser(["ADMIN", "STAFF"]);
  const { clients = "", hoy, o, etiqueta } = await searchParams;
  const clientIds = clients.split(",").filter(Boolean);

  const all = await db.order.findMany({
    where: { status: { in: ["PENDING", "PICKING", "PACKED"] }, ...(clientIds.length && { clientId: { in: clientIds } }) },
    include: { client: true, items: true },
  });
  // Primero los retrasados, luego los de hoy y después el resto; dentro, el más antiguo primero.
  const queue = all
    .filter((x) => !hoy || urgency(x.placedAt) !== "LATER")
    .sort((a, b) => RANK[urgency(a.placedAt)] - RANK[urgency(b.placedAt)] || a.placedAt.getTime() - b.placedAt.getTime());

  const base = `/salida/preparar?clients=${clientIds.join(",")}${hoy ? "&hoy=1" : ""}`;
  const shippedLabel = etiqueta ? await db.order.findUnique({ where: { id: etiqueta }, select: { id: true, number: true, labelProvider: true, status: true } }) : null;

  const printSettings = await getPrintSettings();
  const toPrint = shippedLabel ? await db.order.count({ where: { status: "SHIPPED", labelProvider: { in: ["PACKIA", "SENDCLOUD"] }, labelPrintedAt: null } }) : 0;
  const LabelBanner = shippedLabel?.status === "SHIPPED" && shippedLabel.labelProvider !== "MANUAL" && (
    <div className="mb-6">
      <Notice tone="success">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {printSettings.printOnPack ? (
            <>
              <span>Pedido <b className="mono">{shippedLabel.number}</b> enviado. Su etiqueta se ha abierto para imprimir: pégala ya en su caja.</span>
              <a href={`/api/labels/${shippedLabel.id}`} target="_blank" className="btn-ghost py-2"><Printer className="h-4 w-4" /> ¿No ha salido? Imprimir otra vez</a>
            </>
          ) : (
            <>
              <span>Pedido <b className="mono">{shippedLabel.number}</b> enviado. Su etiqueta está en <b>Etiquetas por imprimir</b> ({toPrint}).</span>
              <span className="flex gap-2">
                <Link href="/etiquetas" className="btn-primary py-2"><Printer className="h-4 w-4" /> Imprimir todas ({toPrint})</Link>
                <a href={`/api/labels/${shippedLabel.id}`} target="_blank" className="btn-ghost py-2">Solo esta</a>
              </span>
            </>
          )}
        </div>
      </Notice>
    </div>
  );

  const index = o === "fin" ? -1 : Math.max(0, o ? queue.findIndex((x) => x.id === o) : 0);
  const current = index >= 0 ? queue[index] : undefined;

  if (!current) {
    return (
      <>
        <BackLink href="/salida">Salida</BackLink>
        {LabelBanner}
        <Card className="mx-auto max-w-xl p-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-mint-500" />
          <h1 className="mt-4 text-3xl font-bold">{queue.length ? "Has llegado al final" : "¡Todo preparado!"}</h1>
          <p className="mt-2 text-ink-500">
            {queue.length
              ? `Quedan ${queue.length} ${queue.length === 1 ? "pedido" : "pedidos"} sin enviar (saltados o embalados sin etiqueta).`
              : "No quedan pedidos pendientes para los clientes elegidos."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {queue.length > 0 && <Link href={base} className="btn-primary">Repasar los que quedan</Link>}
            <Link href="/salida?tab=SHIPPED" className="btn-ghost"><Printer className="h-4 w-4" /> Imprimir etiquetas de hoy</Link>
            <Link href="/salida" className={queue.length ? "btn-ghost" : "btn-primary"}>Volver a Salida</Link>
          </div>
        </Card>
      </>
    );
  }

  const next = queue[index + 1];
  const prev = index > 0 ? queue[index - 1] : null;
  const products = await db.product.findMany({ where: { clientId: current.clientId, sku: { in: current.items.map((i) => i.sku) } } });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const a = parseAddress(current.shippingAddress);
  const shipping = await shippingOptionsFor(current.client);
  const packedCount = queue.filter((x) => x.status === "PACKED").length;
  const blockers = await orderBlockers(current);

  return (
    <>
      <BackLink href="/salida">Salida</BackLink>
      <PageHeader
        eyebrow="Modo preparación"
        title={<>Pedido <span className="text-gradient">{index + 1}</span> de {queue.length}</>}
        description={`${packedCount} embalados pendientes de etiqueta · ${queue.length - packedCount} por preparar${hoy ? " · solo los que salen hoy" : ""}`}
      />
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-line/70">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400 transition-all" style={{ width: `${Math.round(((index + 1) / queue.length) * 100)}%` }} />
      </div>
      {LabelBanner}
      {shipping.error && <div className="mb-4"><Notice tone="error">Sendcloud no disponible: {shipping.error}</Notice></div>}
      {blockers.length > 0 && <div className="mb-4"><BlockersNotice blockers={blockers} returnTo={`${base}&o=${current.id}`} /></div>}
      <Station
        key={current.id}
        order={{
          id: current.id,
          number: current.number,
          status: current.status,
          clientName: current.client.name,
          customerName: current.customerName,
          address: [a.name, a.address1, a.address2, `${a.zip} ${a.city}`, a.country].filter(Boolean).join(" · "),
          urgent: urgency(current.placedAt),
        }}
        items={[...current.items]
          .sort((x, y) => (bySku.get(x.sku)?.location ?? "ZZ").localeCompare(bySku.get(y.sku)?.location ?? "ZZ"))
          .map((i) => ({ id: i.id, sku: i.sku, name: i.name, quantity: i.quantity, location: bySku.get(i.sku)?.location ?? null, stock: bySku.get(i.sku)?.stock ?? null, barcode: bySku.get(i.sku)?.barcode ?? null }))}
        options={shipping.options}
        defaultValue={shipping.defaultValue}
        weight={await estimateWeight(current)}
        blocked={blockers.length > 0}
        printOnPack={printSettings.printOnPack}
        nextHref={next ? `${base}&o=${next.id}` : `${base}&o=fin`}
        prevHref={prev ? `${base}&o=${prev.id}` : null}
      />
    </>
  );
}
