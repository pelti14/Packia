"use client";

import { useActionState, useEffect, useState } from "react";
import { saveBuyerBrand, sendBuyerTestEmail } from "@/app/buyer-brand-actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

const EVENTS = [
  ["RECEIVED", "Pedido recibido"],
  ["PACKED", "Preparado"],
  ["SHIPPED", "Enviado (con seguimiento)"],
  ["DELIVERED", "Entregado"],
] as const;

export function BuyerBrandForm({ clientId, initial, mailReady }: {
  clientId: string;
  mailReady: boolean;
  initial: { trackingEnabled: boolean; publicName: string; clientName: string; hasLogo: boolean; logoSrc: string | null; publicColor: string; publicReplyTo: string; publicMessage: string; notifyBuyer: string; buyerEvents: string[] };
}) {
  const [state, action] = useActionState<FormState, FormData>(saveBuyerBrand.bind(null, clientId), undefined);
  const [tState, tAction] = useActionState<FormState, FormData>(sendBuyerTestEmail.bind(null, clientId), undefined);
  const [name, setName] = useState(initial.publicName);
  const [color, setColor] = useState(initial.publicColor || "#0B0B0D");
  const [message, setMessage] = useState(initial.publicMessage);
  const [notify, setNotify] = useState(initial.notifyBuyer);
  // Tras guardar, React reinicia el formulario: volvemos a lo guardado.
  useEffect(() => setNotify(initial.notifyBuyer), [initial.notifyBuyer, state]);
  const fg = (() => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#0B0B0D" : "#FFFFFF";
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="glass space-y-4 p-6">
        <label className="flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm ring-1 ring-line">
          <input type="checkbox" name="trackingEnabled" defaultChecked={initial.trackingEnabled} className="mt-1 accent-brand-500" />
          <span><b className="text-ink-900">Activar el seguimiento con mi marca</b><br /><span className="text-ink-500">El enlace de seguimiento que recibe tu comprador lleva a una página con tu logo y tus colores.</span></span>
        </label>
        <div>
          <label className="label" htmlFor="publicName">Nombre que ve el comprador</label>
          <input id="publicName" name="publicName" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={initial.clientName} />
        </div>
        <div>
          <label className="label" htmlFor="publicLogo">Logo (PNG, JPG, WEBP o SVG; máx. 300 KB)</label>
          <input id="publicLogo" name="publicLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="input" />
          {initial.hasLogo && <label className="mt-2 flex items-center gap-2 text-xs text-ink-500"><input type="checkbox" name="removeLogo" /> Quitar el logo</label>}
        </div>
        <div className="grid grid-cols-[auto_1fr] items-end gap-3">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line" aria-label="Elegir color" />
          <div>
            <label className="label" htmlFor="publicColor">Color de marca</label>
            <input id="publicColor" name="publicColor" className="input mono" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="publicReplyTo">Email de atención al cliente</label>
          <input id="publicReplyTo" name="publicReplyTo" type="email" defaultValue={initial.publicReplyTo} className="input" placeholder="hola@mitienda.com" />
          <p className="mt-1 text-xs text-ink-400">Si el comprador responde a un aviso, te llega a ti.</p>
        </div>
        <div>
          <label className="label" htmlFor="publicMessage">Mensaje para tus compradores (opcional)</label>
          <textarea id="publicMessage" name="publicMessage" rows={3} maxLength={400} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="¡Gracias por tu compra! Usa el código VUELVE10 en tu próximo pedido." />
        </div>
        <fieldset className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-line">
          <legend className="px-1 text-sm font-semibold text-ink-900">¿Quién avisa al comprador por email?</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="notifyBuyer" value="STORE" defaultChecked={initial.notifyBuyer === "STORE"} onChange={() => setNotify("STORE")} className="mt-1" /> <span>Mi tienda (los emails de Shopify/WooCommerce), con el enlace a mi página de seguimiento</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="notifyBuyer" value="KARGIA" defaultChecked={initial.notifyBuyer === "KARGIA"} onChange={() => setNotify("KARGIA")} className="mt-1" /> <span>Vosotros, con mi marca (y la tienda no envía el suyo de «enviado»)</span></label>
          {notify === "KARGIA" && (
            <div className="grid grid-cols-2 gap-1 pl-6 pt-1">
              {EVENTS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-xs text-ink-700"><input type="checkbox" name={`event_${k}`} defaultChecked={initial.buyerEvents.includes(k)} /> {l}</label>
              ))}
            </div>
          )}
          {notify === "STORE" && EVENTS.map(([k]) => initial.buyerEvents.includes(k) ? <input key={k} type="hidden" name={`event_${k}`} value="on" /> : null)}
        </fieldset>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <Notice tone="success">{state.success}</Notice>}
        <SubmitButton>Guardar mi marca</SubmitButton>
      </form>

      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">Vista previa del email «enviado»</div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-line">
          <div className="px-6 py-5" style={{ background: color, color: fg }}>
            {initial.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={initial.logoSrc} alt="" className="max-h-10 max-w-[180px] object-contain" />
            ) : (
              <span className="text-xl font-extrabold">{name || initial.clientName}</span>
            )}
          </div>
          <div className="space-y-2 p-6 text-sm text-gray-700">
            <div className="text-lg font-bold text-gray-900">¡Tu pedido va de camino!</div>
            <p>Hola Laura,</p>
            <p>Ha salido con GLS (seguimiento PK123456789ES).</p>
            <span className="inline-block rounded-lg px-4 py-2 font-semibold" style={{ background: color, color: fg }}>Ver el estado de mi pedido</span>
            {message && <p className="rounded-lg bg-gray-50 p-3">{message}</p>}
          </div>
        </div>
        <form action={tAction} className="space-y-2">
          {!mailReady && <Notice>Los emails se activan cuando el equipo configure el buzón de envío. La página de seguimiento ya funciona.</Notice>}
          {tState?.error && <Notice tone="error">{tState.error}</Notice>}
          {tState?.success && <Notice tone="success">{tState.success}</Notice>}
          <SubmitButton variant="ghost">Enviarme un email de prueba</SubmitButton>
        </form>
      </div>
    </div>
  );
}
