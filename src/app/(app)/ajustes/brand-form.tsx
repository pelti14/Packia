"use client";

import { useActionState, useState } from "react";
import { saveBrand } from "./actions";
import type { FormState } from "@/app/actions";
import { useBrand } from "@/components/brand";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Notice } from "@/components/ui";

export function BrandForm({ publicUrl }: { publicUrl: string }) {
  const brand = useBrand();
  const [state, action] = useActionState<FormState, FormData>(saveBrand, undefined);
  const v = state?.values ?? {};
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Marca" subtitle="Nombre, logo y contacto: se ven en toda la app, en el acceso de tus clientes y en tu web de GoHighLevel (botones de WhatsApp, email y teléfono)." />
      <form action={action} className="space-y-4 p-5">
        <div className="flex items-center gap-4 rounded-xl bg-white/70 p-4 ring-1 ring-line">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa del logo" className="h-12 w-12 rounded-xl object-contain" />
          ) : null}
          <Logo />
          <span className="ml-auto text-xs text-ink-400">Así se ve ahora</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brandName">Nombre comercial</label>
            <input id="brandName" name="brandName" defaultValue={v.brandName ?? (brand.name === "Kargia" ? "" : brand.name)} placeholder="Kargia" maxLength={40} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="brandTagline">Texto bajo el nombre</label>
            <input id="brandTagline" name="brandTagline" defaultValue={v.brandTagline ?? (brand.tagline === "fulfillment" ? "" : brand.tagline)} placeholder="fulfillment" maxLength={40} className="input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="contactWhatsapp">WhatsApp (con prefijo)</label>
            <input id="contactWhatsapp" name="contactWhatsapp" inputMode="tel" defaultValue={v.contactWhatsapp ?? brand.whatsapp ?? ""} placeholder="34612345678" className="input mono" />
          </div>
          <div>
            <label className="label" htmlFor="contactPhone">Teléfono</label>
            <input id="contactPhone" name="contactPhone" inputMode="tel" defaultValue={v.contactPhone ?? brand.phone ?? ""} placeholder="+34 612 34 56 78" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contactEmail">Email de contacto</label>
            <input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail ?? brand.email ?? ""} placeholder="hola@kargia.eu" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="brandLogo">Logo (cuadrado, PNG/JPG/WEBP/SVG, máx. 300 KB)</label>
          <input
            id="brandLogo"
            name="brandLogo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {brand.logo && (
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-600">
              <input type="checkbox" name="removeLogo" className="h-4 w-4 accent-brand-500" /> Quitar el logo y volver al de serie
            </label>
          )}
        </div>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <Notice tone="success">{state.success}</Notice>}
        <SubmitButton className="w-full">Guardar marca</SubmitButton>
        <p className="text-xs text-ink-400">
          Déjalo vacío para usar «Kargia» y su logo. Tu web de GoHighLevel lee nombre, logo, contacto, datos fiscales y precios de <span className="mono break-all">{publicUrl}</span> y se actualiza sola.
        </p>
      </form>
    </Card>
  );
}
