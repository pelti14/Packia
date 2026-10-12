"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, MapPin, ScanBarcode } from "lucide-react";

export type PickItem = { id: string; sku: string; name: string; quantity: number; location: string | null; stock: number | null; barcode: string | null };

type Counts = Record<string, number>;
type Feedback = { tone: "ok" | "error" | "warn"; text: string } | null;

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Lista de picking: se toca cada producto al cogerlo o se escanea su código de barras
 * (o el SKU). Si se escanea algo que no es del pedido, avisa en rojo. Las marcas se
 * guardan en este navegador por pedido, así no se pierden al recargar.
 */
export function PickList({ orderId, items, interactive = true, size = "md", showStock = true, storageKey }: {
  orderId: string;
  items: PickItem[];
  interactive?: boolean;
  size?: "md" | "lg";
  showStock?: boolean;
  /** Para la demo: no mezclar las marcas con pedidos reales. */
  storageKey?: string;
}) {
  const key = storageKey ?? `packia:pick:${orderId}`;
  const [counts, setCounts] = useState<Counts>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [scan, setScan] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as Counts | string[];
      // Formato antiguo (v5): lista de ids marcados = cogidos del todo.
      setCounts(Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [id, items.find((i) => i.id === id)?.quantity ?? 1])) : raw);
    } catch {
      setCounts({});
    }
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = (n: Counts) => {
    try {
      localStorage.setItem(key, JSON.stringify(n));
    } catch {
      // almacenamiento no disponible (modo privado): las marcas valen solo en esta visita
    }
    return n;
  };

  const toggle = (i: PickItem) =>
    setCounts((s) => save({ ...s, [i.id]: (s[i.id] ?? 0) >= i.quantity ? 0 : i.quantity }));

  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = norm(scan);
    setScan("");
    if (!code) return;
    const match = items.find((i) => (i.barcode && norm(i.barcode) === code) || norm(i.sku) === code);
    if (!match) {
      setFeedback({ tone: "error", text: `«${scan.trim()}» no es de este pedido. Déjalo en su sitio.` });
      beep(false);
      return;
    }
    const have = counts[match.id] ?? 0;
    if (have >= match.quantity) {
      setFeedback({ tone: "warn", text: `Ya tienes las ${match.quantity} unidades de ${match.name}. Sobra esta.` });
      beep(false);
      return;
    }
    setCounts((s) => save({ ...s, [match.id]: have + 1 }));
    setFeedback({ tone: "ok", text: `✓ ${match.name} · ${have + 1} de ${match.quantity}` });
    beep(true);
  };

  const full = (i: PickItem) => (counts[i.id] ?? 0) >= i.quantity;
  const done = items.filter(full).length;
  const lg = size === "lg";

  return (
    <div>
      {interactive && (
        <>
          <form onSubmit={onScan} className="flex items-center gap-2 border-b border-line/60 px-5 py-3">
            <div className="relative flex-1">
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
              <input
                ref={scanRef}
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                className="input mono py-2 pl-9"
                placeholder="Escanea el código de barras o escribe el SKU"
                aria-label="Escanear producto"
                autoComplete="off"
              />
            </div>
            <button className="btn-ghost">Comprobar</button>
          </form>
          {feedback && (
            <div
              role="status"
              className={clsx(
                "border-b px-5 py-2.5 text-sm font-semibold",
                feedback.tone === "ok" && "border-mint-500/20 bg-mint-50 text-mint-600",
                feedback.tone === "warn" && "border-amber-500/20 bg-amber-50 text-amber-600",
                feedback.tone === "error" && "border-rose-500/20 bg-rose-50 text-rose-600",
              )}
            >
              {feedback.text}
            </div>
          )}
          <div className="flex items-center gap-3 border-b border-line/60 px-5 py-3 text-sm">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
              <div className="h-full rounded-full bg-gradient-to-r from-mint-500 to-aqua-400 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
            </div>
            <span className={clsx("font-medium", done === items.length ? "text-mint-600" : "text-ink-500")}>
              {done === items.length ? "✓ Todo cogido" : `${done} de ${items.length} cogidos`}
            </span>
          </div>
        </>
      )}
      <ul className="divide-y divide-line/60">
        {items.map((i) => {
          const on = full(i);
          const partial = !on && (counts[i.id] ?? 0) > 0;
          const body = (
            <>
              {interactive && (
                <span className={clsx("flex shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", lg ? "h-8 w-8" : "h-7 w-7", on ? "border-mint-500 bg-mint-500 text-white" : partial ? "border-amber-500 text-amber-600" : "border-line text-transparent")}>
                  {partial ? counts[i.id] : <Check className="h-4 w-4" />}
                </span>
              )}
              <div className={clsx("mono flex shrink-0 flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-aqua-50 font-semibold text-brand-700 ring-1 ring-brand-100", lg ? "h-14 w-24 rounded-2xl text-sm" : "h-12 w-20 rounded-xl text-xs")}>
                <MapPin className="mb-0.5 h-3 w-3" />
                {i.location ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <div className={clsx("truncate font-medium", lg && "text-lg font-semibold", on ? "text-ink-400 line-through" : "text-ink-900")}>{i.name}</div>
                <div className="mono text-xs text-ink-400">{i.sku}{i.barcode ? ` · ${i.barcode}` : ""}</div>
                {showStock && i.stock !== null && i.stock < i.quantity && <div className="mt-1 text-xs font-semibold text-rose-500">Stock insuficiente: quedan {i.stock}</div>}
                {showStock && i.stock === null && <div className="mt-1 text-xs font-medium text-amber-600">SKU no registrado en inventario</div>}
              </div>
              <div className={clsx("font-display font-bold text-ink-900", lg ? "text-4xl" : "text-2xl")}>×{i.quantity}</div>
            </>
          );
          return (
            <li key={i.id}>
              {interactive ? (
                <button type="button" onClick={() => toggle(i)} className={clsx("flex w-full items-center gap-4 text-left transition", lg ? "gap-5 px-6 py-5" : "px-5 py-4", on ? "bg-mint-50/60" : "hover:bg-brand-50/40")}>
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

/** Pitido corto: agudo si está bien, grave si no. Sin sonido si el navegador no lo permite. */
function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1200 : 220;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.3));
    o.onended = () => ctx.close();
  } catch {
    // sin audio
  }
}
