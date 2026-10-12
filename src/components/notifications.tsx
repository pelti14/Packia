"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Bell, CheckCheck, X } from "lucide-react";
import type { Badges } from "@/lib/notifications";

type Item = { id: string; title: string; body: string | null; href: string | null; tone: string; createdAt: string; unread: boolean };
type State = { items: Item[]; unread: number; badges: Badges };

const Ctx = createContext<{ state: State; refresh: () => void; markSeen: () => void } | null>(null);
const POLL_MS = 20_000;

/** Consulta avisos y contadores cada 20 s y avisa de los nuevos. */
export function NotificationsProvider({ initialBadges, children }: { initialBadges: Badges; children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ items: [], unread: 0, badges: initialBadges });
  const [toasts, setToasts] = useState<Item[]>([]);
  const newest = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as State;
      const fresh = newest.current ? data.items.filter((i) => i.unread && i.id !== newest.current && i.createdAt > (data.items.find((x) => x.id === newest.current)?.createdAt ?? "")) : [];
      if (newest.current && fresh.length) {
        setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 4));
        router.refresh(); // actualiza la página que se está viendo (p. ej. la lista de pedidos)
      }
      newest.current = data.items[0]?.id ?? newest.current ?? "none";
      setState(data);
    } catch {
      // sin conexión: lo intentamos en la siguiente vuelta
    }
  }, [router]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(0, -1)), 7000);
    return () => clearTimeout(t);
  }, [toasts]);

  const markSeen = useCallback(async () => {
    await fetch("/api/notifications", { method: "POST" });
    setState((s) => ({ ...s, unread: 0, items: s.items.map((i) => ({ ...i, unread: false })) }));
  }, []);

  return (
    <Ctx.Provider value={{ state, refresh, markSeen }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex w-80 flex-col gap-2 lg:bottom-6 print:hidden">
        {toasts.map((t) => (
          <div key={t.id} className="glass pointer-events-auto flex items-start gap-3 p-4 shadow-lg">
            <Dot tone={t.tone} />
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                setToasts((x) => x.filter((y) => y.id !== t.id));
                if (t.href) router.push(t.href);
              }}
            >
              <div className="text-sm font-semibold text-ink-900">{t.title}</div>
              {t.body && <div className="truncate text-xs text-ink-500">{t.body}</div>}
            </button>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-ink-400 hover:text-ink-700" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications fuera de NotificationsProvider");
  return ctx;
}

function Dot({ tone }: { tone: string }) {
  return (
    <span
      className={clsx(
        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
        tone === "danger" && "bg-rose-500",
        tone === "warning" && "bg-amber-500",
        tone === "success" && "bg-mint-500",
        tone === "info" && "bg-brand-500",
      )}
    />
  );
}

const rel = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function ago(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(mins) < 60) return rel.format(mins, "minute");
  const h = Math.round(mins / 60);
  return Math.abs(h) < 24 ? rel.format(h, "hour") : rel.format(Math.round(h / 24), "day");
}

/** Campana con la lista de avisos. */
export function NotificationBell() {
  const { state, markSeen } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="glass relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 hover:text-brand-600" aria-label="Notificaciones">
        <Bell className="h-5 w-5" />
        {state.unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {state.unread > 99 ? "99+" : state.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
            <span className="text-sm font-semibold text-ink-900">Notificaciones</span>
            {state.unread > 0 && (
              <button onClick={markSeen} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todo como leído
              </button>
            )}
          </div>
          <ul className="max-h-[26rem] divide-y divide-line/60 overflow-y-auto">
            {state.items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    setOpen(false);
                    if (n.href) router.push(n.href);
                  }}
                  className={clsx("flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-brand-50/50", n.unread && "bg-brand-50/40")}
                >
                  <Dot tone={n.tone} />
                  <div className="min-w-0 flex-1">
                    <div className={clsx("text-sm text-ink-900", n.unread && "font-semibold")}>{n.title}</div>
                    {n.body && <div className="truncate text-xs text-ink-500">{n.body}</div>}
                    <div className="mt-0.5 text-[11px] text-ink-400">{ago(n.createdAt)}</div>
                  </div>
                </button>
              </li>
            ))}
            {!state.items.length && <li className="px-4 py-8 text-center text-sm text-ink-500">Sin notificaciones</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
