"use client";

import { useActionState } from "react";
import { savePlans } from "./actions";
import type { FormState } from "@/app/actions";
import type { PlanOption } from "@/lib/plans";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Notice } from "@/components/ui";

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function PlansForm({ plans, publicUrl }: { plans: PlanOption[]; publicUrl: string }) {
  const [state, action] = useActionState<FormState, FormData>(savePlans, undefined);
  const v = state?.values ?? {};
  return (
    <Card>
      <CardHeader title="Planes y precios" subtitle="Sin IVA. Se copian al cliente al darle de alta o cambiarle de plan; luego se pueden personalizar en su ficha." />
      <form action={action} className="space-y-4 p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="table-head">Plan</th>
                <th className="table-head">Pedidos incluidos</th>
                <th className="table-head">Cuota (€/mes)</th>
                <th className="table-head">Pedido adicional (€)</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.plan}>
                  <td className="py-1.5 pr-2"><input name={`label_${p.plan}`} defaultValue={v[`label_${p.plan}`] ?? p.label} className="input" aria-label={`Nombre del plan ${p.label}`} /></td>
                  <td className="py-1.5 pr-2"><input name={`orders_${p.plan}`} type="number" min={1} defaultValue={v[`orders_${p.plan}`] ?? p.orders} className="input mono" aria-label={`Pedidos del plan ${p.label}`} /></td>
                  <td className="py-1.5 pr-2"><input name={`fee_${p.plan}`} inputMode="decimal" defaultValue={v[`fee_${p.plan}`] ?? euros(p.feeCents)} className="input mono" aria-label={`Cuota del plan ${p.label}`} /></td>
                  <td className="py-1.5"><input name={`extra_${p.plan}`} inputMode="decimal" defaultValue={v[`extra_${p.plan}`] ?? euros(p.extraCents)} className="input mono" aria-label={`Pedido adicional del plan ${p.label}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <label className="label" htmlFor="apply">Clientes que ya tienen estos planes</label>
          <select id="apply" name="apply" defaultValue={v.apply ?? "none"} className="input">
            <option value="none">No cambiarles nada (solo clientes nuevos y cambios de plan)</option>
            <option value="today">Aplicarles los precios nuevos desde hoy (prorrateado)</option>
            <option value="next">Aplicarles los precios nuevos desde el día 1 del mes que viene</option>
          </select>
        </div>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.success && <Notice tone="success">{state.success}</Notice>}
        <SubmitButton className="w-full">Guardar precios</SubmitButton>
        <p className="text-xs text-ink-400">
          Tu web de GoHighLevel lee estos precios de <span className="mono break-all">{publicUrl}</span> y se actualiza sola.
        </p>
      </form>
    </Card>
  );
}
