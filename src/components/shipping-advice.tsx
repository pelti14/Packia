import { Sparkles } from "lucide-react";
import type { ShippingAdvice } from "@/lib/shipping";

const eur = (c: number) => (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

/** Recuadro con la agencia recomendada (Transporte) y las alternativas. */
export function ShippingAdviceBox({ advice }: { advice: ShippingAdvice }) {
  return (
    <div className="rounded-xl bg-brand-50/70 p-3 text-xs text-ink-700 ring-1 ring-brand-200">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
        <Sparkles className="h-4 w-4 text-brand-600" /> {advice.title}
      </div>
      <div className="mt-0.5">{advice.detail}</div>
      {advice.options.length > 1 && (
        <ul className="mt-2 space-y-0.5">
          {advice.options.map((o) => (
            <li key={o.method} className={o.best ? "font-semibold text-ink-900" : "text-ink-500"}>
              {o.best ? "★" : "·"} {o.label}: {eur(o.chargeCents)} ({eur(o.costCents)} coste) · {o.days} {o.days === 1 ? "día" : "días"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
