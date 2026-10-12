import { clsx } from "clsx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id="packia-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a52f0" />
          <stop offset="0.55" stopColor="#4f6bff" />
          <stop offset="1" stopColor="#12c8d9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#packia-g)" />
      <path d="M20 8.5 30 14v12l-10 5.5L10 26V14z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 14l10 5.5L30 14M20 19.5v12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" opacity=".8" />
      <circle cx="30" cy="10" r="2.6" fill="#a5f3fc" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-xl font-bold tracking-tight text-ink-900">
          pack<span className="text-gradient">ia</span>
        </div>
        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-400">fulfillment</div>
      </div>
    </div>
  );
}
