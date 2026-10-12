"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { Plug } from "lucide-react";
import { connectStore, type FormState } from "@/app/actions";
import type { Platform } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

const GUIDE: Record<Platform, string[]> = {
  SHOPIFY: [
    "En el admin de Shopify: Configuración → Apps y canales de venta → Desarrollar apps → Crear una app.",
    "Permisos de la Admin API: read_orders, read_products, read_merchant_managed_fulfillment_orders y write_merchant_managed_fulfillment_orders.",
    "Instala la app y copia el token de acceso (shpat_…).",
    "En Configuración → Notificaciones → Webhooks copia la clave de firma que muestra Shopify.",
    "Pega aquí el dominio mitienda.myshopify.com, el token y la clave de firma.",
  ],
  WOOCOMMERCE: [
    "En WordPress: WooCommerce → Ajustes → Avanzado → REST API → Añadir clave.",
    "Permisos: Lectura/Escritura. Copia la clave de cliente (ck_…) y el secreto (cs_…).",
    "Pega aquí la URL de la tienda (con https) y las dos claves.",
    "Después te daremos la URL y el secreto para crear el webhook de pedidos.",
  ],
};

export function ConnectForm({ clients, defaultClient }: { clients: { id: string; name: string }[]; defaultClient?: string }) {
  const [state, action] = useActionState<FormState, FormData>(connectStore, undefined);
  const [platform, setPlatform] = useState<Platform>("SHOPIFY");
  const v = state?.values ?? {};

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <form action={action} className="glass space-y-5 p-6 xl:col-span-3">
        <input type="hidden" name="platform" value={platform} />

        <div>
          <span className="label">Plataforma</span>
          <div className="grid grid-cols-2 gap-3">
            {(["SHOPIFY", "WOOCOMMERCE"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={clsx(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  platform === p
                    ? "border-brand-400 bg-gradient-to-br from-brand-50 to-white shadow-[0_0_0_4px_var(--color-brand-100)]"
                    : "border-line bg-white/70 hover:border-brand-200",
                )}
              >
                <div className="font-display text-base font-semibold text-ink-900">{p === "SHOPIFY" ? "Shopify" : "WooCommerce"}</div>
                <div className="mt-0.5 text-xs text-ink-500">{p === "SHOPIFY" ? "App personalizada · Admin API" : "REST API · claves ck/cs"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="clientId">Cliente</label>
            <select id="clientId" name="clientId" className="input" defaultValue={v.clientId || defaultClient || clients[0]?.id} required>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="name">Nombre de la tienda</label>
            <input id="name" name="name" defaultValue={v.name} className="input" placeholder="Tienda online" required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="domain">{platform === "SHOPIFY" ? "Dominio de Shopify" : "URL de la tienda"}</label>
          <input id="domain" name="domain" defaultValue={v.domain} className="input mono" placeholder={platform === "SHOPIFY" ? "mitienda.myshopify.com" : "https://mitienda.com"} required />
        </div>

        {platform === "SHOPIFY" ? (
          <>
            <div>
              <label className="label" htmlFor="accessToken">Token de acceso (Admin API)</label>
              <input id="accessToken" name="accessToken" type="password" className="input mono" placeholder="shpat_…" required />
            </div>
            <div>
              <label className="label" htmlFor="webhookSecret">Clave de firma de webhooks</label>
              <input id="webhookSecret" name="webhookSecret" type="password" className="input mono" placeholder="Configuración → Notificaciones → Webhooks" />
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="consumerKey">Clave de cliente</label>
              <input id="consumerKey" name="consumerKey" defaultValue={v.consumerKey} className="input mono" placeholder="ck_…" required />
            </div>
            <div>
              <label className="label" htmlFor="consumerSecret">Secreto de cliente</label>
              <input id="consumerSecret" name="consumerSecret" type="password" className="input mono" placeholder="cs_…" required />
            </div>
          </div>
        )}

        {state?.error && <Notice tone="error">{state.error} Vuelve a introducir las claves secretas.</Notice>}
        <SubmitButton className="w-full"><Plug className="h-4 w-4" /> Probar conexión y conectar</SubmitButton>
      </form>

      <div className="xl:col-span-2">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white/80 to-aqua-50/80 p-6 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Paso a paso</div>
          <h3 className="mt-2 text-lg font-semibold text-ink-900">Cómo conectar {platform === "SHOPIFY" ? "Shopify" : "WooCommerce"}</h3>
          <ol className="mt-5 space-y-4">
            {GUIDE[platform].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-ink-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
