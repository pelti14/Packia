"use client";

import { useActionState, useRef } from "react";
import { updateClient, type FormState } from "@/app/actions";
import type { PlanOption } from "@/lib/plans";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Values = Record<"name" | "contactEmail" | "taxId" | "billingAddress" | "plan" | "planOrders" | "monthlyFee" | "extraOrderFee" | "returnFee" | "serviceStartAt" | "trialWeeks" | "planEffective", string>;

export function ClientForm({ clientId, initial, plans }: { clientId: string; initial: Values; plans: PlanOption[] }) {
  const [state, action] = useActionState<FormState, FormData>(updateClient.bind(null, clientId), undefined);
  const v = { ...initial, ...(state?.values ?? {}) } as Values;
  const formRef = useRef<HTMLFormElement>(null);
  const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  /** Al elegir otro plan se rellenan sus condiciones de Ajustes (se pueden retocar). */
  const fillPlan = (key: string) => {
    const p = plans.find((x) => x.plan === key);
    const f = formRef.current;
    if (!p || !f) return;
    (f.elements.namedItem("planOrders") as HTMLInputElement).value = String(p.orders);
    (f.elements.namedItem("monthlyFee") as HTMLInputElement).value = euros(p.feeCents);
    (f.elements.namedItem("extraOrderFee") as HTMLInputElement).value = euros(p.extraCents);
  };
  return (
    <form ref={formRef} action={action} className="grid gap-6 xl:grid-cols-2">
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
          <select id="plan" name="plan" defaultValue={v.plan} className="input" onChange={(e) => fillPlan(e.target.value)}>
            {plans.map((p) => <option key={p.plan} value={p.plan}>{p.label} · {p.orders} pedidos · {euros(p.feeCents)} €</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="planOrders" label="Pedidos incluidos" type="number" defaultValue={v.planOrders} />
          <Field id="monthlyFee" label="Cuota mensual (€)" defaultValue={v.monthlyFee} inputMode="decimal" />
          <Field id="extraOrderFee" label="Pedido adicional (€)" defaultValue={v.extraOrderFee} inputMode="decimal" />
          <Field id="returnFee" label="Devolución (€)" defaultValue={v.returnFee} inputMode="decimal" />
          <Field id="serviceStartAt" label="Fecha de alta" type="date" defaultValue={v.serviceStartAt} />
          <Field id="trialWeeks" label="Semanas de prueba" type="number" min={0} max={26} defaultValue={v.trialWeeks} />
        </div>
        <div>
          <label className="label" htmlFor="planEffective">Si cambias plan, pedidos o precios, aplicarlo</label>
          <select id="planEffective" name="planEffective" defaultValue={v.planEffective || "today"} className="input">
            <option value="today">Desde hoy, prorrateado por días (cuota y pedidos incluidos)</option>
            <option value="month">Desde el día 1 de este mes (todo el mes con el nuevo plan)</option>
            <option value="next">Desde el día 1 del mes que viene</option>
          </select>
        </div>
        <p className="text-xs text-ink-400">La prueba empieza en la fecha de alta y no se cobra. El primer mes de pago se prorratea por días. Un cambio de plan a mitad de mes reparte la cuota y los pedidos incluidos entre los dos planes según los días.</p>
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
