"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { Plug } from "lucide-react";
import { connectStore, type FormState } from "@/app/actions";
import type { Platform } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Guide = "SHOPIFY_DEV" | "SHOPIFY_LEGACY" | "WOOCOMMERCE";

const SCOPES = "read_orders, read_products, read_merchant_managed_fulfillment_orders, write_merchant_managed_fulfillment_orders";

const GUIDE: Record<Guide, string[]> = {
  SHOPIFY_DEV: [
    "Lo hace el dueño de la tienda en SU admin de Shopify: Configuración → Apps → Desarrollar apps → «Build apps in Dev Dashboard» → Create app → el nombre de tu empresa.",
    "En la versión de la app: deja la App URL por defecto y en Access → Scopes pon: " + SCOPES + ". Pulsa Release.",
    "En la app → Installs → Install app → elige su tienda → Install.",
    "En la app → Settings: copia el Client ID y el Client secret.",
    "Dominio: Shopify → Configuración → Dominios → el que termina en .myshopify.com. Pega aquí los 3 datos.",
    "La app crea sola los webhooks de pedidos. Si los pedidos llegan sin dirección, activa «Protected customer data» en la app.",
  ],
  SHOPIFY_LEGACY: [
    "Solo para apps creadas en el admin ANTES de 2026 (Configuración → Apps → Desarrollar apps → tu app).",
    "En «Credenciales de la API» copia el token de acceso de la Admin API (shpat_…) y la clave secreta de la API.",
    "Permisos necesarios: " + SCOPES + ".",
    "Pega aquí el dominio .myshopify.com, el token y la clave secreta. La app crea sola los webhooks.",
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
  const [shopifyMode, setShopifyMode] = useState<"dev" | "legacy">("dev");
  const v = state?.values ?? {};
  const guide: Guide = platform === "WOOCOMMERCE" ? "WOOCOMMERCE" : shopifyMode === "dev" ? "SHOPIFY_DEV" : "SHOPIFY_LEGACY";

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <form action={action} className="glass space-y-5 p-6 xl:col-span-3">
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="shopifyMode" value={shopifyMode} />

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
          <label className="label" htmlFor="domain">{platform === "SHOPIFY" ? "Dominio interno de Shopify" : "URL de la tienda"}</label>
          <input id="domain" name="domain" defaultValue={v.domain} className="input mono" placeholder={platform === "SHOPIFY" ? "mitienda.myshopify.com" : "https://mitienda.com"} required />
          {platform === "SHOPIFY" && (
            <p className="mt-1.5 text-xs text-ink-400">Shopify → Configuración → Dominios → el que termina en <b>.myshopify.com</b>. No es un email ni tu dominio propio.</p>
          )}
        </div>

        {platform === "SHOPIFY" ? (
          <>
            <div>
              <span className="label">Tipo de app de Shopify</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/50 p-1 text-sm font-medium">
                <button type="button" onClick={() => setShopifyMode("dev")} className={clsx("rounded-lg px-3 py-2 transition", shopifyMode === "dev" ? "bg-white text-brand-700 shadow-sm" : "text-ink-500")}>
                  Dev Dashboard (2026+)
                </button>
                <button type="button" onClick={() => setShopifyMode("legacy")} className={clsx("rounded-lg px-3 py-2 transition", shopifyMode === "legacy" ? "bg-white text-brand-700 shadow-sm" : "text-ink-500")}>
                  App antigua (token shpat_)
                </button>
              </div>
            </div>
            {shopifyMode === "dev" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="shopifyClientId">Client ID</label>
                  <input id="shopifyClientId" name="shopifyClientId" defaultValue={v.shopifyClientId} className="input mono" autoComplete="off" required />
                </div>
                <div>
                  <label className="label" htmlFor="shopifyClientSecret">Client secret</label>
                  <input id="shopifyClientSecret" name="shopifyClientSecret" type="password" className="input mono" autoComplete="new-password" required />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="accessToken">Token de acceso (Admin API)</label>
                  <input id="accessToken" name="accessToken" type="password" className="input mono" placeholder="shpat_…" required />
                </div>
                <div>
                  <label className="label" htmlFor="apiSecret">Clave secreta de la API</label>
                  <input id="apiSecret" name="apiSecret" type="password" className="input mono" placeholder="Para verificar los webhooks" />
                </div>
              </div>
            )}
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

        {state?.error && <Notice tone="error">{state.error} Vuelve a escribir la clave secreta.</Notice>}
        <SubmitButton className="w-full"><Plug className="h-4 w-4" /> Probar conexión y conectar</SubmitButton>
      </form>

      <div className="xl:col-span-2">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white/80 to-aqua-50/80 p-6 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Paso a paso</div>
          <h3 className="mt-2 text-lg font-semibold text-ink-900">
            Cómo conectar {platform === "WOOCOMMERCE" ? "WooCommerce" : shopifyMode === "dev" ? "Shopify (Dev Dashboard)" : "Shopify (app antigua)"}
          </h3>
          <ol className="mt-5 space-y-4">
            {GUIDE[guide].map((step, i) => (
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
