"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Check, MapPin } from "lucide-react";

export type PickItem = { id: string; sku: string; name: string; quantity: number; location: string | null; stock: number | null };

/**
 * Lista de picking: se toca cada producto al cogerlo. Las marcas se guardan en este
 * navegador por pedido, así no se pierden al recargar o al volver más tarde.
 */
export function PickList({ orderId, items, interactive = true, size = "md", showStock = true }: {
  orderId: string;
  items: PickItem[];
  interactive?: boolean;
  size?: "md" | "lg";
  showStock?: boolean;
}) {
  const key = `packia:pick:${orderId}`;
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setPicked(new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]));
    } catch {
      setPicked(new Set());
    }
  }, [key]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...n]));
      } catch {
        // almacenamiento no disponible (modo privado): las marcas valen solo en esta visita
      }
      return n;
    });

  const done = items.filter((i) => picked.has(i.id)).length;
  const lg = size === "lg";

  return (
    <div>
      {interactive && (
        <div className="flex items-center gap-3 border-b border-line/60 px-5 py-3 text-sm">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
            <div className="h-full rounded-full bg-gradient-to-r from-mint-500 to-aqua-400 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
          </div>
          <span className={clsx("font-medium", done === items.length ? "text-mint-600" : "text-ink-500")}>
            {done === items.length ? "✓ Todo cogido" : `${done} de ${items.length} cogidos`}
          </span>
        </div>
      )}
      <ul className="divide-y divide-line/60">
        {items.map((i) => {
          const on = picked.has(i.id);
          const body = (
            <>
              {interactive && (
                <span className={clsx("flex shrink-0 items-center justify-center rounded-full border-2", lg ? "h-8 w-8" : "h-7 w-7", on ? "border-mint-500 bg-mint-500 text-white" : "border-line text-transparent")}>
                  <Check className="h-4 w-4" />
                </span>
              )}
              <div className={clsx("mono flex shrink-0 flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-aqua-50 font-semibold text-brand-700 ring-1 ring-brand-100", lg ? "h-14 w-24 rounded-2xl text-sm" : "h-12 w-20 rounded-xl text-xs")}>
                <MapPin className="mb-0.5 h-3 w-3" />
                {i.location ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <div className={clsx("truncate font-medium", lg && "text-lg font-semibold", on ? "text-ink-400 line-through" : "text-ink-900")}>{i.name}</div>
                <div className="mono text-xs text-ink-400">{i.sku}</div>
                {showStock && i.stock !== null && i.stock < i.quantity && <div className="mt-1 text-xs font-semibold text-rose-500">Stock insuficiente: quedan {i.stock}</div>}
                {showStock && i.stock === null && <div className="mt-1 text-xs font-medium text-amber-600">SKU no registrado en inventario</div>}
              </div>
              <div className={clsx("font-display font-bold text-ink-900", lg ? "text-4xl" : "text-2xl")}>×{i.quantity}</div>
            </>
          );
          return (
            <li key={i.id}>
              {interactive ? (
                <button type="button" onClick={() => toggle(i.id)} className={clsx("flex w-full items-center gap-4 text-left transition", lg ? "gap-5 px-6 py-5" : "px-5 py-4", on ? "bg-mint-50/60" : "hover:bg-brand-50/40")}>
                  {body}
                </button>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
