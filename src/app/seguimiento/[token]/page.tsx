import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseAddress } from "@/lib/format";
import { EVENT_LABEL, BUYER_EVENTS, safeColor, stageOf, textOn, validTrackingToken } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de tu pedido", robots: { index: false, follow: false } };

const fmt = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(d) : null;

/** Página pública de seguimiento con la marca de la tienda. Solo muestra lo imprescindible (sin dirección completa). */
export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validTrackingToken(token)) notFound();
  const o = await db.order.findUnique({
    where: { trackingToken: token },
    select: {
      number: true, status: true, placedAt: true, shippedAt: true, deliveredAt: true, carrier: true, trackingNumber: true, trackingUrl: true, carrierStatus: true, shippingAddress: true, customerName: true,
      items: { select: { name: true, quantity: true } },
      client: { select: { name: true, publicName: true, publicLogo: true, publicColor: true, publicMessage: true, publicReplyTo: true } },
    },
  });
  if (!o) notFound();
  const brand = o.client.publicName || o.client.name;
  const color = safeColor(o.client.publicColor);
  const fg = textOn(color);
  const stage = stageOf(o);
  const city = parseAddress(o.shippingAddress).city;
  const cancelled = o.status === "CANCELLED";
  const dates = [fmt(o.placedAt), null, fmt(o.shippedAt), fmt(o.deliveredAt)];
  const headline = cancelled ? "Pedido cancelado" : ["Hemos recibido tu pedido", "Tu pedido está preparado", "Tu pedido va de camino", "¡Pedido entregado!"][stage];

  return (
    <div className="min-h-screen bg-[#f4f4f5] px-4 py-8">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex min-h-20 items-center px-6 py-5" style={{ background: color, color: fg }}>
          {o.client.publicLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/seguimiento/${token}/logo`} alt={brand} className="max-h-12 max-w-[200px] object-contain" />
          ) : (
            <span className="text-2xl font-extrabold">{brand}</span>
          )}
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">Pedido {o.number}{o.customerName ? ` · ${o.customerName.split(/\s+/)[0]}` : ""}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{headline}</h1>
          {o.carrierStatus && !cancelled && stage === 2 && <p className="mt-1 text-sm text-gray-500">{o.carrierStatus}</p>}

          {!cancelled && (
            <ol className="mt-6 space-y-0">
              {BUYER_EVENTS.map((e, i) => {
                const done = i <= stage;
                return (
                  <li key={e} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < BUYER_EVENTS.length - 1 && <span className="absolute left-[11px] top-6 h-full w-0.5" style={{ background: i < stage ? color : "#e5e7eb" }} />}
                    <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={done ? { background: color, color: fg } : { background: "#e5e7eb", color: "#6b7280" }}>
                      {done ? "✓" : i + 1}
                    </span>
                    <div>
                      <div className={done ? "font-semibold text-gray-900" : "text-gray-400"}>{EVENT_LABEL[e]}</div>
                      {done && dates[i] && <div className="text-xs text-gray-500">{dates[i]}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {o.trackingNumber && !cancelled && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="text-gray-500">Transportista</div>
              <div className="font-semibold text-gray-900">{o.carrier}</div>
              <div className="mt-1 font-mono text-gray-700">{o.trackingNumber}</div>
              {o.trackingUrl && (
                <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg px-4 py-2 font-semibold" style={{ background: color, color: fg }}>
                  Seguir en la web del transportista
                </a>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-gray-900">Tu pedido{city ? ` · envío a ${city}` : ""}</div>
            <ul className="divide-y divide-gray-100 text-sm">
              {o.items.map((it, i) => (
                <li key={i} className="flex gap-3 py-2"><span className="text-gray-500">{it.quantity}×</span><span className="text-gray-900">{it.name}</span></li>
              ))}
            </ul>
          </div>

          {o.client.publicMessage && <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{o.client.publicMessage}</p>}
          {o.client.publicReplyTo && (
            <p className="mt-4 text-sm text-gray-500">¿Alguna duda? Escríbenos a <a className="font-semibold text-gray-900 underline" href={`mailto:${o.client.publicReplyTo}`}>{o.client.publicReplyTo}</a></p>
          )}
        </div>
      </div>
    </div>
  );
}
