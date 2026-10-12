"use client";

import { useActionState } from "react";
import { BadgeCheck, ScanBarcode } from "lucide-react";
import { validateProduct, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { BrandName } from "@/components/brand";

type Initial = { name: string; barcode: string; location: string; weightGrams: string };

export function ValidateForm({ productId, next, initial }: { productId: string; next: string; initial: Initial }) {
  const [state, action] = useActionState<FormState, FormData>(validateProduct.bind(null, productId, next), undefined);
  const v = { ...initial, ...(state?.values ?? {}) };
  return (
    <form action={action} className="glass space-y-5 p-6">
      <div>
        <label className="label" htmlFor="barcode">Código de barras</label>
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500" />
          <input id="barcode" name="barcode" defaultValue={v.barcode} autoFocus className="input mono py-3 pl-11 text-base" placeholder="Escanéalo con el lector o escríbelo" autoComplete="off" />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">Con el código guardado, en el picking se puede escanear el producto y <BrandName /> avisa si no es el del pedido.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Nombre (como aparece en la etiqueta del producto)</label>
        <input id="name" name="name" defaultValue={v.name} className="input" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="location">Ubicación en el almacén</label>
          <input id="location" name="location" defaultValue={v.location} className="input mono" placeholder="A-01-01" />
        </div>
        <div>
          <label className="label" htmlFor="weightGrams">Peso unitario (g)</label>
          <input id="weightGrams" name="weightGrams" type="number" min={0} defaultValue={v.weightGrams} className="input mono" />
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50/60 p-4 text-sm text-ink-700 ring-1 ring-brand-100">
        <input type="checkbox" name="checked" className="mt-0.5 h-5 w-5 accent-brand-500" />
        He comprobado físicamente el producto: coincide con el nombre y el SKU, está en esa ubicación y el código de barras es el suyo.
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full py-3"><BadgeCheck className="h-5 w-5" /> Dar OK al producto</SubmitButton>
    </form>
  );
}
