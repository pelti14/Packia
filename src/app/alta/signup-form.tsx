"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Plan = { plan: string; label: string; orders: number; feeCents: number };

export function SignupForm({ invite, email, company, plans, fixedPlan }: { invite: string; email?: string; company?: string; plans: Plan[]; fixedPlan?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signupAction.bind(null, invite), undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="company" label="Empresa / tienda" defaultValue={v.company ?? company} required />
        <Field id="name" label="Tu nombre" defaultValue={v.name} required />
        <Field id="email" label="Email" type="email" defaultValue={v.email ?? email} readOnly={Boolean(email)} required />
        <Field id="phone" label="Teléfono / WhatsApp" defaultValue={v.phone} />
        <Field id="storeUrl" label="Web de la tienda" defaultValue={v.storeUrl} placeholder="https://mitienda.com" />
        <div>
          <label className="label" htmlFor="monthlyOrders">Pedidos al mes</label>
          <select id="monthlyOrders" name="monthlyOrders" defaultValue={v.monthlyOrders ?? "300-600"} className="input">
            {["<150", "150-300", "300-600", "600-1000", ">1000"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      {!fixedPlan && (
        <div>
          <label className="label" htmlFor="plan">Plan</label>
          <select id="plan" name="plan" defaultValue={v.plan ?? plans[0]?.plan} className="input">
            {plans.map((p) => <option key={p.plan} value={p.plan}>{p.label} · {p.orders} pedidos · {(p.feeCents / 100).toLocaleString("es-ES")} €/mes</option>)}
          </select>
        </div>
      )}
      <Field id="password" label="Contraseña (mín. 10 caracteres)" type="password" autoComplete="new-password" required />
      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-brand-500" />
        Acepto las condiciones del servicio y la política de privacidad.
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full py-3">Crear mi cuenta</SubmitButton>
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
