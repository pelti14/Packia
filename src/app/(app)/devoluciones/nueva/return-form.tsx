"use client";

import { useActionState, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { createReturn } from "../actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Notice } from "@/components/ui";

type Order = { id: string; number: string; customerName: string; clientName: string; items: { id: string; sku: string; name: string; quantity: number }[] };

const REASONS = ["No le queda bien / talla", "Producto defectuoso", "No era lo que esperaba", "Llegó dañado", "Envío erróneo", "Desistimiento"];

export function ReturnForm({ orders, defaultOrderId }: { orders: Order[]; defaultOrderId?: string }) {
  const [state, action] = useActionState<FormState, FormData>(createReturn, undefined);
  const [query, setQuery] = useState("");
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const order = orders.find((o) => o.id === orderId);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? orders.filter((o) => o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)) : orders).slice(0, 8);
  }, [orders, query]);

  return (
    <form action={action} className="grid items-start gap-6 xl:grid-cols-3">
      <input type="hidden" name="orderId" value={orderId} />
      <Card className="xl:col-span-2">
        <CardHeader title="Pedido" subtitle="Busca por número o destinatario entre los pedidos enviados" />
        <div className="space-y-4 px-5 py-5">
          {!order ? (
            <>
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="input" placeholder="#4123 o nombre del cliente" autoFocus />
              <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line bg-white/80">
                {matches.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => setOrderId(o.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-brand-50/50">
                      <span className="mono w-20 font-semibold text-ink-900">{o.number}</span>
                      <span className="flex-1 truncate text-sm text-ink-700">{o.customerName}</span>
                      <span className="text-xs text-ink-400">{o.clientName}</span>
                    </button>
                  </li>
                ))}
                {!matches.length && <li className="px-4 py-3 text-sm text-ink-500">Sin resultados</li>}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-brand-50/60 px-4 py-3 ring-1 ring-brand-100">
                <div>
                  <span className="mono font-semibold text-ink-900">{order.number}</span>
                  <span className="ml-3 text-sm text-ink-700">{order.customerName}</span>
                  <span className="ml-3 text-xs text-ink-400">{order.clientName}</span>
                </div>
                <button type="button" onClick={() => setOrderId("")} className="text-xs font-semibold text-brand-600 hover:underline">Cambiar</button>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-head px-0">Producto</th>
                    <th className="table-head">Enviadas</th>
                    <th className="table-head">Devuelve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-3">
                        <div className="text-sm font-medium text-ink-900">{i.name}</div>
                        <div className="mono text-xs text-ink-400">{i.sku}</div>
                      </td>
                      <td className="cell mono">{i.quantity}</td>
                      <td className="cell">
                        <input name={`qty_${i.id}`} type="number" min={0} max={i.quantity} defaultValue={i.quantity} className="input mono w-20 py-1.5" aria-label={`Devuelve ${i.sku}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Motivo" />
        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="label" htmlFor="reason">Motivo de la devolución</label>
            <input id="reason" name="reason" list="reasons" className="input" placeholder="Elige o escribe" />
            <datalist id="reasons">{REASONS.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full"><RotateCcw className="h-4 w-4" /> Registrar devolución</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
