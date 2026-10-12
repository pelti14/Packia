"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { processReturn } from "../actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Item = { id: string; sku: string; name: string; quantity: number };

export function ProcessForm({ returnId, items }: { returnId: string; items: Item[] }) {
  const [state, action] = useActionState<FormState, FormData>(processReturn.bind(null, returnId), undefined);
  return (
    <form action={action}>
      <ul className="divide-y divide-line/60">
        {items.map((i) => (
          <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink-900">{i.name}</div>
              <div className="mono text-xs text-ink-400">{i.sku} · ×{i.quantity}</div>
            </div>
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/80 px-3 py-2 text-sm has-[:checked]:border-mint-500 has-[:checked]:bg-mint-50 has-[:checked]:text-mint-600">
                <input type="radio" name={`condition_${i.id}`} value="RESTOCK" defaultChecked className="accent-mint-500" /> Vuelve a stock
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/80 px-3 py-2 text-sm has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50 has-[:checked]:text-rose-500">
                <input type="radio" name={`condition_${i.id}`} value="DAMAGED" className="accent-rose-500" /> Dañado
              </label>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 border-t border-line/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">Lo que vuelve a stock se suma al inventario. La devolución se factura al cliente al procesarla.</p>
        <SubmitButton><CheckCircle2 className="h-4 w-4" /> Procesar devolución</SubmitButton>
      </div>
      {state?.error && <div className="px-5 pb-4"><Notice tone="error">{state.error}</Notice></div>}
    </form>
  );
}
