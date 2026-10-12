"use client";

import { useActionState } from "react";
import { Truck } from "lucide-react";
import { updateClientShipping, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { BrandName } from "@/components/brand";

type Option = { value: string; label: string; group: string };

export function ShippingForm({ clientId, options, current, ownSendcloud, error }: {
  clientId: string;
  options: Option[];
  current: string | null;
  ownSendcloud: boolean;
  error?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateClientShipping.bind(null, clientId), undefined);
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <form action={action} className="glass space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-50 p-2.5 ring-1 ring-brand-100"><Truck className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h2 className="text-base font-semibold">Envíos</h2>
          <p className="text-xs text-ink-500">El repartidor por defecto se elige solo en cada pedido de este cliente, salvo que lo cambies a mano.</p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="defaultShipping">Repartidor por defecto</label>
        <select id="defaultShipping" name="defaultShipping" defaultValue={current ?? ""} className="input">
          <option value="">Sin preferencia (el primero disponible)</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-line bg-white/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-ink-900">Cuenta de Sendcloud propia del cliente</div>
          {ownSendcloud && <span className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-600 ring-1 ring-mint-500/25">Conectada</span>}
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Opcional. Si el cliente tiene sus propios contratos con GLS, MRW, SEUR… los conecta en su Sendcloud y aquí pegas sus claves. Las etiquetas saldrán con sus tarifas. Si lo dejas vacío, se usa el Sendcloud de <BrandName />.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="sendcloudPublicKey" className="input mono" placeholder={ownSendcloud ? "•••• (en blanco = sin cambios)" : "Clave pública"} autoComplete="off" aria-label="Clave pública de Sendcloud del cliente" />
          <input name="sendcloudSecretKey" type="password" className="input mono" placeholder={ownSendcloud ? "•••• (en blanco = sin cambios)" : "Clave secreta"} autoComplete="new-password" aria-label="Clave secreta de Sendcloud del cliente" />
        </div>
        {ownSendcloud && (
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-500">
            <input type="checkbox" name="clearSendcloud" className="accent-rose-500" /> Desconectar su Sendcloud
          </label>
        )}
      </div>

      {error && <Notice tone="error">Sendcloud: {error}</Notice>}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <SubmitButton>Guardar envíos</SubmitButton>
    </form>
  );
}
