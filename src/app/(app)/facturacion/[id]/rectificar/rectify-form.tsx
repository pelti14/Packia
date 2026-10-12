"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { rectifyInvoiceAction } from "../../actions";
import { ConfirmSubmit } from "@/components/confirm-submit";

type Row = { description: string; quantity: number | string; unitPrice: string };
const num = (v: string | number) => Number(String(v).replace(",", ".")) || 0;
const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export function RectifyForm({ invoiceId, taxRate, lines }: { invoiceId: string; taxRate: number; lines: Row[] }) {
  const [rows, setRows] = useState<Row[]>(lines);
  const [rate, setRate] = useState(String(taxRate));
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const subtotal = rows.reduce((n, r) => n + num(r.quantity) * num(r.unitPrice), 0);
  const tax = (subtotal * num(rate)) / 100;

  return (
    <form action={rectifyInvoiceAction.bind(null, invoiceId)} className="glass space-y-5 p-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="table-head pl-0">Concepto</th>
              <th className="table-head w-28">Cantidad</th>
              <th className="table-head w-36">Precio (€)</th>
              <th className="table-head w-32 text-right">Importe</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-2"><input name="description" value={r.description} onChange={(e) => set(i, { description: e.target.value })} className="input" aria-label="Concepto" required /></td>
                <td className="py-1.5 pr-2"><input name="quantity" value={r.quantity} onChange={(e) => set(i, { quantity: e.target.value })} inputMode="numeric" className="input mono" aria-label="Cantidad" /></td>
                <td className="py-1.5 pr-2"><input name="unitPrice" value={r.unitPrice} onChange={(e) => set(i, { unitPrice: e.target.value })} inputMode="decimal" className="input mono" aria-label="Precio" /></td>
                <td className="mono py-1.5 text-right">{eur(num(r.quantity) * num(r.unitPrice))}</td>
                <td className="py-1.5 text-right">
                  <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Quitar línea">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setRows((x) => [...x, { description: "", quantity: 1, unitPrice: "0,00" }])} className="btn-ghost">
        <Plus className="h-4 w-4" /> Añadir línea
      </button>
      <p className="text-xs text-ink-400">Para un descuento o abono, usa un precio en negativo (por ejemplo −20,00).</p>

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div>
          <label className="label" htmlFor="reason">Motivo de la corrección (sale en la rectificativa)</label>
          <textarea id="reason" name="reason" required rows={3} className="input" placeholder="Precio de pedido adicional mal aplicado, devolución no facturada…" />
        </div>
        <div className="space-y-2 rounded-xl bg-white/70 p-4 text-sm ring-1 ring-line">
          <div className="flex justify-between"><span className="text-ink-500">Base imponible</span><span className="mono">{eur(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-500">IVA %</span>
            <input name="taxRate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" className="input mono w-20 py-1 text-right" aria-label="IVA" />
          </div>
          <div className="flex justify-between"><span className="text-ink-500">IVA</span><span className="mono">{eur(tax)}</span></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total nuevo</span><span className="mono">{eur(subtotal + tax)}</span></div>
        </div>
      </div>

      <ConfirmSubmit className="w-full py-3" confirm="Se anulará la factura original con una rectificativa y se emitirá una nueva con estos importes. ¿Continuar?">
        Emitir factura corregida
      </ConfirmSubmit>
    </form>
  );
}
