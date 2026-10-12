"use client";

import { useActionState } from "react";
import { updateClient, type FormState } from "@/app/actions";
import { PLANS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Values = Record<"name" | "contactEmail" | "taxId" | "billingAddress" | "plan" | "planOrders" | "monthlyFee" | "extraOrderFee" | "returnFee", string>;

export function ClientForm({ clientId, initial }: { clientId: string; initial: Values }) {
  const [state, action] = useActionState<FormState, FormData>(updateClient.bind(null, clientId), undefined);
  const v = { ...initial, ...(state?.values ?? {}) } as Values;
  return (
    <form action={action} className="grid gap-6 xl:grid-cols-2">
      <div className="glass space-y-4 p-6">
        <h2 className="text-base font-semibold">Datos de facturación</h2>
        <Field id="name" label="Empresa" defaultValue={v.name} required />
        <Field id="taxId" label="NIF / CIF" defaultValue={v.taxId} />
        <Field id="contactEmail" label="Email de contacto" type="email" defaultValue={v.contactEmail} />
        <div>
          <label className="label" htmlFor="billingAddress">Dirección fiscal</label>
          <textarea id="billingAddress" name="billingAddress" rows={3} defaultValue={v.billingAddress} className="input" />
        </div>
      </div>
      <div className="glass space-y-4 p-6">
        <h2 className="text-base font-semibold">Plan y tarifas (sin IVA)</h2>
        <div>
          <label className="label" htmlFor="plan">Plan</label>
          <select id="plan" name="plan" defaultValue={v.plan} className="input">
            {Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="planOrders" label="Pedidos incluidos" type="number" defaultValue={v.planOrders} />
          <Field id="monthlyFee" label="Cuota mensual (€)" defaultValue={v.monthlyFee} inputMode="decimal" />
          <Field id="extraOrderFee" label="Pedido adicional (€)" defaultValue={v.extraOrderFee} inputMode="decimal" />
          <Field id="returnFee" label="Devolución (€)" defaultValue={v.returnFee} inputMode="decimal" />
        </div>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <Notice tone="success">{state.success}</Notice>}
        <SubmitButton className="w-full">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}

function Field({ id, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} name={id} className="input" {...props} />
    </div>
  );
}
