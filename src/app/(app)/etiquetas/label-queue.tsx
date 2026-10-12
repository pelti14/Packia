"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Printer, Undo2 } from "lucide-react";
import { clsx } from "clsx";
import { setPrinted } from "@/app/print-actions";

export type QueueRow = {
  id: string;
  number: string;
  client: string;
  customer: string;
  carrier: string;
  tracking: string;
  shippedAt: string;
  printedAt: string | null;
  printCount: number;
};

export function LabelQueue({ rows, pendingTab }: { rows: QueueRow[]; pendingTab: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(() => new Set(pendingTab ? rows.map((r) => r.id) : []));
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  // Tras abrir el PDF, refrescamos para que pasen a «Impresas».
  const afterPrint = () => setTimeout(() => router.refresh(), 2500);

  // Agrupado por agencia: un montón por repartidor.
  const groups = rows.reduce<Record<string, QueueRow[]>>((g, r) => ((g[r.carrier || "Sin agencia"] ??= []).push(r), g), {});

  return (
    <form action="/api/labels/batch" method="get" target="_blank" onSubmit={afterPrint}>
      <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-line backdrop-blur">
        <label className="flex items-center gap-2 px-2 text-sm font-medium text-ink-700">
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-brand-500" />
          Todas ({rows.length})
        </label>
        <button disabled={!sel.size} className="btn-primary disabled:opacity-50">
          <Printer className="h-4 w-4" /> Imprimir {sel.size ? `${sel.size} ${sel.size === 1 ? "etiqueta" : "etiquetas"}` : "seleccionadas"}
        </button>
        {pendingTab ? (
          <button disabled={!sel.size} formAction={setPrinted.bind(null, true)} formMethod="post" formTarget="_self" className="btn-ghost disabled:opacity-50">
            <CheckCheck className="h-4 w-4" /> Marcar como impresas
          </button>
        ) : (
          <button disabled={!sel.size} formAction={setPrinted.bind(null, false)} formMethod="post" formTarget="_self" className="btn-ghost disabled:opacity-50">
            <Undo2 className="h-4 w-4" /> Volver a «Por imprimir»
          </button>
        )}
        <span className="text-xs text-ink-400">Salen todas seguidas en un solo PDF, en el formato de tu impresora.</span>
      </div>

      <div className="space-y-5">
        {Object.entries(groups).map(([carrier, list]) => {
          const groupAll = list.every((r) => sel.has(r.id));
          return (
            <div key={carrier} className="glass overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line/60 px-5 py-3">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${carrier}`}
                  checked={groupAll}
                  onChange={() => setSel((s) => {
                    const n = new Set(s);
                    list.forEach((r) => (groupAll ? n.delete(r.id) : n.add(r.id)));
                    return n;
                  })}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="font-semibold text-ink-900">{carrier}</span>
                <span className="text-sm text-ink-500">{list.length} {list.length === 1 ? "etiqueta" : "etiquetas"}</span>
              </div>
              <ul className="divide-y divide-line/60">
                {list.map((r) => (
                  <li key={r.id}>
                    <label className={clsx("flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm transition", sel.has(r.id) ? "bg-brand-50/50" : "hover:bg-white/60")}>
                      <input type="checkbox" name="ids" value={r.id} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-brand-500" />
                      <span className="mono w-20 font-semibold text-ink-900">{r.number}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-700">{r.customer} <span className="text-ink-400">· {r.client}</span></span>
                      <span className="mono text-xs text-ink-500">{r.tracking}</span>
                      <span className="w-24 text-right text-xs text-ink-400">{r.shippedAt}</span>
                      {r.printedAt && <span className="text-xs text-mint-600">Impresa {r.printedAt}{r.printCount > 1 ? ` (${r.printCount}×)` : ""}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </form>
  );
}
