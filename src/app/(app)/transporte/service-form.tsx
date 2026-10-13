"use client";

import { useActionState } from "react";
import { saveCarrierService } from "@/app/carrier-actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Zone = { key: string; label: string };
type Option = { value: string; label: string; group: string };
export type ServiceInitial = {
  id: string | null;
  name: string;
  carrier: string;
  labelMethod: string;
  transitDays: number;
  maxKg: number;
  active: boolean;
  rates: Record<string, Record<string, number>>;
};

const euros = (c: number | undefined) => (c === undefined ? "" : (c / 100).toFixed(2).replace(".", ","));

export function ServiceForm({ initial, zones, bands, options }: { initial: ServiceInitial; zones: Zone[]; bands: number[]; options: Option[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCarrierService.bind(null, initial.id), undefined);
  const v = state?.values;
  const val = (k: string, fallback: string) => v?.[k] ?? fallback;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="label">Nombre del servicio</label>
          <input name="name" defaultValue={val("name", initial.name)} className="input" placeholder="GLS Business 24h" required />
        </div>
        <div>
          <label className="label">Agencia</label>
          <input name="carrier" defaultValue={val("carrier", initial.carrier)} className="input" placeholder="GLS" required />
        </div>
        <div className="md:col-span-2">
          <label className="label">Etiqueta</label>
          <select name="labelMethod" defaultValue={val("labelMethod", initial.labelMethod)} className="input">
            {[...new Set(options.map((o) => o.group))].map((g) => (
              <optgroup key={g} label={g}>
                {options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Días</label>
            <input name="transitDays" type="number" min={0} max={30} defaultValue={val("transitDays", String(initial.transitDays))} className="input mono" />
          </div>
          <div>
            <label className="label">Máx. kg</label>
            <input name="maxKg" inputMode="decimal" defaultValue={val("maxKg", String(initial.maxKg))} className="input mono" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="table-head pl-0">Coste (€, sin IVA)</th>
              {bands.map((b) => <th key={b} className="table-head text-center">≤ {b / 1000} kg</th>)}
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.key}>
                <td className="py-1 pr-2 font-medium text-ink-700">{z.label}</td>
                {bands.map((b) => (
                  <td key={b} className="px-1 py-1">
                    <input
                      name={`rate_${z.key}_${b}`}
                      defaultValue={val(`rate_${z.key}_${b}`, euros(initial.rates[z.key]?.[String(b)]))}
                      inputMode="decimal"
                      className="input mono px-2 py-1.5 text-center"
                      aria-label={`${z.label} hasta ${b / 1000} kg`}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">Deja en blanco las zonas o pesos que este servicio no cubre. Para cada envío se usa el primer tramo que alcanza su peso.</p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="active" defaultChecked={v ? v.active === "on" : initial.active} className="h-4 w-4 accent-brand-500" /> Activo
        </label>
        <SubmitButton>{initial.id ? "Guardar servicio" : "Crear servicio"}</SubmitButton>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <Notice tone="success">{state.success}</Notice>}
      </div>
    </form>
  );
}
