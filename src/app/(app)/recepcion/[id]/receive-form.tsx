"use client";

import { useActionState } from "react";
import { PackageCheck } from "lucide-react";
import { receiveInbound } from "../actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Item = { id: string; sku: string; name: string; expectedQty: number; location: string | null };

export function ReceiveForm({ inboundId, items }: { inboundId: string; items: Item[] }) {
  const [state, action] = useActionState<FormState, FormData>(receiveInbound.bind(null, inboundId), undefined);
  return (
    <form action={action}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-line/70 bg-white/40">
            <tr>
              <th className="table-head">Producto</th>
              <th className="table-head">Previstas</th>
              <th className="table-head">Recibidas</th>
              <th className="table-head">Dañadas</th>
              <th className="table-head">Ubicación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="cell">
                  <div className="font-medium text-ink-900">{i.name}</div>
                  <div className="mono text-xs text-ink-400">{i.sku}</div>
                </td>
                <td className="cell mono font-semibold text-ink-900">{i.expectedQty}</td>
                <td className="cell"><input name={`received_${i.id}`} type="number" min={0} defaultValue={i.expectedQty} className="input mono w-24 py-1.5" aria-label={`Recibidas ${i.sku}`} /></td>
                <td className="cell"><input name={`damaged_${i.id}`} type="number" min={0} defaultValue={0} className="input mono w-20 py-1.5" aria-label={`Dañadas ${i.sku}`} /></td>
                <td className="cell"><input name={`location_${i.id}`} defaultValue={i.location ?? ""} placeholder="A-01-01" className="input mono w-28 py-1.5" aria-label={`Ubicación ${i.sku}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-line/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">Las unidades recibidas menos las dañadas se suman al stock. Las referencias nuevas se crean en el inventario.</p>
        <SubmitButton><PackageCheck className="h-4 w-4" /> Confirmar recepción</SubmitButton>
      </div>
      {state?.error && <div className="px-5 pb-4"><Notice tone="error">{state.error}</Notice></div>}
    </form>
  );
}
