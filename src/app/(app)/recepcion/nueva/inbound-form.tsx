"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createInbound } from "../actions";
import type { FormState } from "@/app/actions";
import { CARRIERS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Notice } from "@/components/ui";

type Product = { clientId: string; sku: string; name: string };
type Line = { sku: string; name: string; qty: number };

export function InboundForm({ clients, products, fixedClientId }: { clients: { id: string; name: string }[]; products: Product[]; fixedClientId?: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInbound, undefined);
  const v = state?.values ?? {};
  const [clientId, setClientId] = useState(fixedClientId ?? v.clientId ?? clients[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>(() => {
    try {
      const parsed = JSON.parse(v.lines || "[]") as Line[];
      return parsed.length ? parsed : [{ sku: "", name: "", qty: 1 }];
    } catch {
      return [{ sku: "", name: "", qty: 1 }];
    }
  });
  const catalog = useMemo(() => products.filter((p) => p.clientId === clientId), [products, clientId]);

  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, ...patch };
        if (patch.sku !== undefined) {
          const match = catalog.find((p) => p.sku.toUpperCase() === patch.sku!.trim().toUpperCase());
          if (match) next.name = match.name;
        }
        return next;
      }),
    );

  return (
    <form action={action} className="grid items-start gap-6 xl:grid-cols-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <Card className="xl:col-span-2">
        <CardHeader title="Qué llega" subtitle="Escribe el SKU: si ya existe en el inventario se completa el nombre" />
        <datalist id="skus">
          {catalog.map((p) => <option key={p.sku} value={p.sku}>{p.name}</option>)}
        </datalist>
        <div className="space-y-3 px-5 py-5">
          <div className="grid grid-cols-[1fr_1.5fr_90px_40px] gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            <span>SKU</span><span>Producto</span><span>Uds.</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_90px_40px] gap-2">
              <input list="skus" value={l.sku} onChange={(e) => update(i, { sku: e.target.value })} className="input mono py-2" placeholder="SKU" aria-label="SKU" />
              <input value={l.name} onChange={(e) => update(i, { name: e.target.value })} className="input py-2" placeholder="Nombre del producto" aria-label="Producto" />
              <input type="number" min={1} value={l.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} className="input mono py-2" aria-label="Unidades" />
              <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} className="rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30" aria-label="Quitar línea">
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLines((ls) => [...ls, { sku: "", name: "", qty: 1 }])} className="btn-ghost">
            <Plus className="h-4 w-4" /> Añadir referencia
          </button>
          <div className="text-right text-sm text-ink-500">
            Total: <b className="mono text-ink-900">{lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)}</b> unidades
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Datos de la entrega" />
        <div className="space-y-4 px-5 py-5">
          {!fixedClientId && (
            <div>
              <label className="label" htmlFor="clientId">Cliente</label>
              <select id="clientId" name="clientId" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="reference">Referencia</label>
            <input id="reference" name="reference" defaultValue={v.reference} className="input" placeholder="Albarán o pedido al proveedor" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="carrier">Transporte</label>
              <input id="carrier" name="carrier" list="carriers" defaultValue={v.carrier} className="input" placeholder="Agencia" />
              <datalist id="carriers">{CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label" htmlFor="boxes">Bultos</label>
              <input id="boxes" name="boxes" type="number" min={1} defaultValue={v.boxes} className="input mono" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="expectedAt">Llegada prevista</label>
            <input id="expectedAt" name="expectedAt" type="date" defaultValue={v.expectedAt} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notas</label>
            <textarea id="notes" name="notes" defaultValue={v.notes} rows={3} className="input" placeholder="Palés, etiquetado, instrucciones…" />
          </div>
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full">Crear aviso de entrada</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
