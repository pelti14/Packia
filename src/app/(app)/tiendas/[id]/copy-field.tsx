"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white/90 py-1.5 pl-3.5 pr-1.5">
        <code className="mono min-w-0 flex-1 truncate text-ink-700">{value}</code>
        <button
          type="button"
          className="rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-mint-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
