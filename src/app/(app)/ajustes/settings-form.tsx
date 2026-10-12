"use client";

import { startTransition, useActionState, useRef } from "react";
import { PlugZap, Save } from "lucide-react";
import { saveSettings, testSendcloud } from "./actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Values = Record<string, string>;

export function SettingsForm({ initial, sendcloudSaved, autoInvoice }: { initial: Values; sendcloudSaved: boolean; autoInvoice: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, undefined);
  const [testState, testAction, testing] = useActionState<FormState, FormData>(testSendcloud, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Tras guardar, React reinicia el formulario: los valores vuelven como defaultValue.
  const values = { ...initial, ...(state?.values ?? {}) };

  return (
    <form ref={formRef} action={action} className="grid gap-6 xl:grid-cols-2">
      <section className="glass space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold">Datos fiscales</h2>
          <p className="text-xs text-ink-500">Aparecen en las facturas.</p>
        </div>
        <Field id="companyName" label="Razón social" initial={values} placeholder="Mi Empresa Logística S.L." />
        <div className="grid grid-cols-2 gap-3">
          <Field id="companyTaxId" label="NIF / CIF" initial={values} />
          <Field id="companyEmail" label="Email de facturación" initial={values} type="email" />
        </div>
        <Field id="companyAddress" label="Dirección fiscal" initial={values} />
        <Field id="companyIban" label="IBAN para cobros" initial={values} placeholder="ES00 0000 0000 0000 0000 0000" />
        <Field id="invoicePrefix" label="Serie de facturas (KG → KG-2026-0001; rectificativas KGR-…)" initial={values} placeholder="KG" />
      </section>

      <section className="glass space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold">Almacén (remitente)</h2>
          <p className="text-xs text-ink-500">Aparece en las etiquetas de envío.</p>
        </div>
        <Field id="senderName" label="Nombre" initial={values} placeholder="Mi Empresa Logística" />
        <Field id="senderAddress" label="Dirección" initial={values} />
        <div className="grid grid-cols-3 gap-3">
          <Field id="senderZip" label="C. P." initial={values} />
          <Field id="senderCity" label="Ciudad" initial={values} />
          <Field id="senderCountry" label="País" initial={values} placeholder="ES" maxLength={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="senderPhone" label="Teléfono" initial={values} />
          <Field id="senderEmail" label="Email" initial={values} type="email" />
        </div>
      </section>

      <section className="glass flex items-start justify-between gap-4 p-6 xl:col-span-2">
        <div>
          <h2 className="text-base font-semibold">Facturación automática</h2>
          <p className="text-xs text-ink-500">Del día 1 al 5 de cada mes, la app emite sola las facturas del mes anterior y avisa a cada cliente. Si la desactivas, emítelas con el botón de Facturación.</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
          <input type="checkbox" name="autoInvoice" defaultChecked={autoInvoice} className="h-5 w-5 accent-brand-500" /> Activada
        </label>
      </section>

      <section className="glass space-y-4 p-6 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Sendcloud · etiquetas oficiales de las agencias</h2>
            <p className="text-xs text-ink-500">Sendcloud → Ajustes → Integraciones → Sendcloud API. Las claves se guardan cifradas.</p>
          </div>
          {sendcloudSaved && <span className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-600 ring-1 ring-mint-500/25">Claves guardadas</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sendcloudPublicKey">Clave pública</label>
            <input id="sendcloudPublicKey" name="sendcloudPublicKey" className="input mono" placeholder={sendcloudSaved ? "•••••••• (en blanco = sin cambios)" : ""} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="sendcloudSecretKey">Clave secreta</label>
            <input id="sendcloudSecretKey" name="sendcloudSecretKey" type="password" className="input mono" placeholder={sendcloudSaved ? "•••••••• (en blanco = sin cambios)" : ""} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Fuera del envío del formulario: probar no borra lo que aún no se ha guardado. */}
          <button
            type="button"
            disabled={testing}
            onClick={() => startTransition(() => testAction(new FormData(formRef.current!)))}
            className="btn-ghost"
          >
            <PlugZap className="h-4 w-4" /> {testing ? "Probando…" : "Probar conexión"}
          </button>
          {sendcloudSaved && (
            <label className="flex items-center gap-2 text-sm text-ink-500">
              <input type="checkbox" name="clearSendcloud" className="accent-rose-500" /> Borrar claves guardadas
            </label>
          )}
        </div>
        {testState?.error && <Notice tone="error">{testState.error}</Notice>}
        {testState?.success && <Notice tone="success">{testState.success}</Notice>}
      </section>

      <div className="flex items-center gap-4 xl:col-span-2">
        <SubmitButton><Save className="h-4 w-4" /> Guardar ajustes</SubmitButton>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <span className="text-sm font-medium text-mint-600">{state.success}</span>}
      </div>
    </form>
  );
}

function Field({ id, label, initial, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; initial: Values }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} name={id} defaultValue={initial[id] ?? ""} className="input" {...props} />
    </div>
  );
}
