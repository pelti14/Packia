import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { Blocker } from "@/lib/validation";

/** Aviso de productos que hay que validar antes de embalar, con enlace directo a cada uno. */
export function BlockersNotice({ blockers, returnTo }: { blockers: Blocker[]; returnTo: string }) {
  if (!blockers.length) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-500/30">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
        <ShieldAlert className="h-4 w-4" /> No se puede embalar todavía
      </div>
      <p className="mt-1 text-xs text-ink-700">Estos productos necesitan el OK del equipo para evitar errores de picking:</p>
      <ul className="mt-2 space-y-1.5">
        {blockers.map((b) => (
          <li key={b.sku} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate"><span className="mono text-xs text-ink-500">{b.sku}</span> · {b.name}</span>
            {b.productId ? (
              <Link href={`/inventario/validar/${b.productId}?next=${encodeURIComponent(returnTo)}`} className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50">
                Validar
              </Link>
            ) : (
              <span className="shrink-0 text-xs font-semibold text-rose-500">No está en inventario</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
