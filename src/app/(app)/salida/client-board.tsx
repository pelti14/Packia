"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, PackageCheck, Play, Truck } from "lucide-react";

export type ClientCard = {
  id: string;
  name: string;
  platforms: string[];
  shipping: string | null;
  open: number;
  today: number;
  overdue: number;
  pending: number;
  packed: number;
};

/** Cuadrícula de clientes: se seleccionan y se empieza a preparar pedido a pedido. */
export function ClientBoard({ cards }: { cards: ClientCard[] }) {
  const selectable = cards.filter((c) => c.open > 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyToday, setOnlyToday] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));
  const chosen = cards.filter((c) => selected.has(c.id));
  const count = chosen.reduce((n, c) => n + (onlyToday ? c.today : c.open), 0);
  const href = `/salida/preparar?clients=${chosen.map((c) => c.id).join(",")}${onlyToday ? "&hoy=1" : ""}`;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c.id)))}
            className="btn-ghost"
            disabled={!selectable.length}
          >
            <span className={clsx("flex h-4 w-4 items-center justify-center rounded border", allSelected ? "border-ink-900 bg-brand-400 text-ink-900" : "border-ink-400")}>
              {allSelected && <Check className="h-3 w-3" />}
            </span>
            {allSelected ? "Quitar selección" : "Seleccionar todos"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-700">
            <input type="checkbox" checked={onlyToday} onChange={(e) => setOnlyToday(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Solo los que salen hoy
          </label>
        </div>
        {chosen.length > 0 && count > 0 ? (
          <Link href={href} className="btn-primary">
            <Play className="h-4 w-4" /> Empezar a preparar · {count} {count === 1 ? "pedido" : "pedidos"}
          </Link>
        ) : (
          <span className="text-sm text-ink-400">Selecciona uno o varios clientes para empezar</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const on = selected.has(c.id);
          const empty = c.open === 0;
          return (
            <button
              key={c.id}
              type="button"
              disabled={empty}
              onClick={() => toggle(c.id)}
              className={clsx(
                "group relative flex min-h-44 flex-col rounded-3xl border p-6 text-left transition-all duration-200",
                on
                  ? "border-brand-400 bg-gradient-to-br from-brand-50 via-white to-aqua-50 shadow-[0_0_0_4px_var(--color-brand-100),var(--shadow-glass)]"
                  : "border-white/70 bg-white/70 shadow-[var(--shadow-glass)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-brand-200",
                empty && "cursor-default opacity-60 hover:translate-y-0",
              )}
            >
              <span
                className={clsx(
                  "absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full border-2 transition",
                  on ? "border-ink-900 bg-brand-400 text-ink-900" : "border-line bg-white text-transparent group-hover:border-brand-300",
                  empty && "hidden",
                )}
              >
                <Check className="h-4 w-4" />
              </span>
              <div className="pr-10 font-display text-2xl font-bold leading-tight text-ink-900">{c.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                {c.platforms.join(" · ") || "Sin tienda"}
                {c.shipping && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-line/60 px-2 py-0.5 font-medium text-ink-500">
                    <Truck className="h-3 w-3" /> {c.shipping}
                  </span>
                )}
              </div>
              <div className="mt-auto flex items-end justify-between pt-6">
                {empty ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-600"><PackageCheck className="h-4 w-4" /> Al día</span>
                ) : (
                  <>
                    <div>
                      <div className="font-display text-5xl font-bold leading-none text-ink-900">{c.today}</div>
                      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-400">salen hoy</div>
                    </div>
                    <div className="space-y-1 text-right text-xs">
                      {c.overdue > 0 && <div className="font-semibold text-rose-500">{c.overdue} retrasados</div>}
                      <div className="text-ink-500">{c.pending} sin preparar</div>
                      <div className="text-ink-500">{c.packed} embalados</div>
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
