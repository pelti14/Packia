"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { shipOrderAction, type FormState } from "@/app/actions";
import { CARRIERS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function ShipForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState<FormState, FormData>(shipOrderAction.bind(null, orderId), undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="carrier">Agencia</label>
        <select id="carrier" name="carrier" className="input" defaultValue={v.carrier || "MRW"}>
          {CARRIERS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="trackingNumber">Número de seguimiento</label>
        <input id="trackingNumber" name="trackingNumber" className="input mono" defaultValue={v.trackingNumber} placeholder="Escanea o escribe el código" autoFocus />
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <SubmitButton className="w-full"><Send className="h-4 w-4" /> Marcar como enviado</SubmitButton>
    </form>
  );
}
