"use client";

import { useRouter } from "next/navigation";

/** Desplegable para saltar a cualquier mes (los últimos 36). */
export function MonthPicker({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(`/facturacion?month=${e.target.value}`)}
      className="min-w-44 cursor-pointer bg-transparent px-2 py-1.5 text-center text-sm font-semibold text-ink-900 outline-none"
      aria-label="Elegir mes"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
