import { CheckCircle2, XCircle } from "lucide-react";
import type { Check } from "@/lib/setup";

export function StatusList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y divide-line/60">
      {checks.map((c) => (
        <li key={c.key} className="flex items-start gap-3 px-5 py-3.5">
          {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink-900">{c.label}</div>
            {c.detail && <div className="break-words text-xs text-ink-500">{c.detail}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
