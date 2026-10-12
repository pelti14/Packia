"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createClient, type FormState } from "@/app/actions";
import { PLANS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

const today = () => new Date().toISOString().slice(0, 10);

export function NewClientForm() {
  const [state, action] = useActionState<FormState, FormData>(createClient, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4 px-5 py-5">
      <div>
        <label className="label" htmlFor="name">Empresa</label>
        <input id="name" name="name" defaultValue={v.name} className="input" placeholder="Nombre de la marca" required />
      </div>
      <div>
        <label className="label" htmlFor="contactEmail">Email de contacto</label>
        <input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail} className="input" placeholder="hola@marca.com" />
      </div>
      <div>
        <label className="label" htmlFor="plan">Plan</label>
        <select id="plan" name="plan" className="input" defaultValue={v.plan || "ARRANQUE"}>
          {Object.entries(PLANS).map(([key, p]) => (
            <option key={key} value={key}>{p.label} · hasta {p.orders} pedidos/mes</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="serviceStartAt">Fecha de alta</label>
          <input id="serviceStartAt" name="serviceStartAt" type="date" defaultValue={v.serviceStartAt || today()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="trialWeeks">Semanas de prueba</label>
          <input id="trialWeeks" name="trialWeeks" type="number" min={0} max={26} defaultValue={v.trialWeeks || "2"} className="input mono" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-ink-400">La prueba no se cobra. El primer mes de pago se prorratea por días.</p>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <SubmitButton className="w-full"><UserPlus className="h-4 w-4" /> Crear cliente</SubmitButton>
    </form>
  );
}
