"use client";

import { clsx } from "clsx";
import { useBrand } from "@/components/brand";

/** Icono de la marca: el logo subido en Ajustes o el de serie. */
export function LogoMark({ className }: { className?: string }) {
  const brand = useBrand();
  if (brand.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo} alt={brand.name} className={clsx("h-9 w-9 shrink-0 rounded-[11px] object-contain", className)} />;
  }
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

/** Nombre con estilo: las 2 últimas letras con degradado, como «pack·ia». */
export function BrandWordmark({ className, plain }: { className?: string; plain?: boolean }) {
  const { name } = useBrand();
  const lower = name === "Packia" ? "packia" : name;
  const cut = lower.length > 4 && !lower.includes(" ") ? lower.length - 2 : lower.length;
  return (
    <span className={className}>
      {lower.slice(0, cut)}
      {cut < lower.length && <span className={plain ? undefined : "text-gradient"}>{lower.slice(cut)}</span>}
    </span>
  );
}

export function Logo() {
  const brand = useBrand();
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="min-w-0 leading-none">
        <BrandWordmark className="block truncate font-display text-xl font-bold tracking-tight text-ink-900" />
        <div className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.2em] text-ink-400">{brand.tagline}</div>
      </div>
    </div>
  );
}
