"use client";

import { useActionState } from "react";
import { Printer } from "lucide-react";
import { savePrintSettings } from "@/app/print-actions";
import type { FormState } from "@/app/actions";
import { PRINT_FORMAT_OPTIONS, type PrintSettingsValues } from "@/lib/labels/print-options";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function PrintSettingsForm({ initial }: { initial: PrintSettingsValues }) {
  const [state, action] = useActionState<FormState, FormData>(savePrintSettings, undefined);
  const v = { ...initial, ...(state?.values ?? {}) } as Record<string, string | number | boolean>;
  const checked = (k: string) => (state?.values ? state.values[k] === "on" : Boolean(initial[k as keyof PrintSettingsValues]));
  return (
    <form action={action} className="space-y-4">
      <div>
        <div className="label">Tipo de impresora y papel</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRINT_FORMAT_OPTIONS.map((f) => (
            <label key={f.value} className="flex cursor-pointer gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-line has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-500">
              <input type="radio" name="printFormat" value={f.value} defaultChecked={v.printFormat === f.value} className="mt-1 accent-brand-500" />
              <span>
                <span className="block text-sm font-semibold text-ink-900">{f.label}</span>
                <span className="block text-xs text-ink-500">{f.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="printOffsetX">Mover → (mm)</label>
          <input id="printOffsetX" name="printOffsetX" inputMode="decimal" defaultValue={String(v.printOffsetX)} className="input mono" />
        </div>
        <div>
          <label className="label" htmlFor="printOffsetY">Mover ↑ (mm)</label>
          <input id="printOffsetY" name="printOffsetY" inputMode="decimal" defaultValue={String(v.printOffsetY)} className="input mono" />
        </div>
        <div>
          <label className="label" htmlFor="printScale">Escala (%)</label>
          <input id="printScale" name="printScale" type="number" min={50} max={150} defaultValue={String(v.printScale)} className="input mono" />
        </div>
        <div>
          <label className="label" htmlFor="printSort">Orden</label>
          <select id="printSort" name="printSort" defaultValue={String(v.printSort)} className="input">
            <option value="CARRIER">Por agencia</option>
            <option value="CLIENT">Por cliente</option>
            <option value="TIME">Por hora de envío</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
        <label className="flex items-center gap-2"><input type="checkbox" name="printAutoDialog" defaultChecked={checked("printAutoDialog")} className="h-4 w-4 accent-brand-500" /> Abrir el diálogo de imprimir al instante</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="printRotate180" defaultChecked={checked("printRotate180")} className="h-4 w-4 accent-brand-500" /> Girar 180° (salen al revés)</label>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar impresora</SubmitButton>
        <a href="/api/labels/test?n=1" target="_blank" className="btn-ghost"><Printer className="h-4 w-4" /> Página de prueba</a>
        <a href="/api/labels/test?n=4" target="_blank" className="btn-ghost">Prueba con 4 etiquetas</a>
      </div>
      <div className="rounded-xl bg-brand-50/60 p-4 text-xs leading-relaxed text-ink-700 ring-1 ring-brand-100">
        <b>Para que salga perfecta</b>, la primera vez en el diálogo de imprimir del navegador:
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Elige tu impresora y el <b>tamaño de papel</b> igual al de arriba (en térmica: 100 × 150 mm o 4 × 6&quot;).</li>
          <li>Escala: <b>Tamaño real / 100 %</b> (no «Ajustar a la página»). Márgenes: <b>Ninguno</b>.</li>
          <li>Desmarca «Encabezados y pies de página».</li>
        </ol>
        El navegador lo recuerda para la próxima vez. Si aún queda desplazada, corrige con «Mover» (mm) y repite la prueba.
      </div>
    </form>
  );
}
