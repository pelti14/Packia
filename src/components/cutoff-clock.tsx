"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

const CUTOFF_HOUR = 14;

function remaining(now: Date) {
  const cutoff = new Date(now);
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  return cutoff.getTime() - now.getTime();
}

/** Cuenta atrás hasta la hora de corte: lo que entra antes sale hoy. */
export function CutoffClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="h-9 w-48" />;
  const ms = remaining(now);
  const open = ms > 0;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="glass flex items-center gap-3 rounded-xl px-3.5 py-2">
      <Timer className={open ? "h-4 w-4 text-brand-600" : "h-4 w-4 text-ink-400"} />
      <div className="text-xs text-ink-500">{open ? "Corte de hoy en" : "Corte cerrado · sale mañana"}</div>
      {open && <div className="mono font-semibold text-ink-900">{pad(h)}:{pad(m)}:{pad(s)}</div>}
    </div>
  );
}
