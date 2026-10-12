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
    <svg viewBox="25 31 141 141" className={clsx("h-9 w-9 shrink-0", className)} aria-hidden>
      <rect x="25" y="31" width="141" height="141" rx="32" fill="#0b0b0d" />
      <path d="M60 51H96L54 98L88 140H33V79Z" fill="#f0f0f0" stroke="#f0f0f0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M117 51H153L108 100L156 152H120L72 100Z" fill="#c3fc1d" stroke="#c3fc1d" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Nombre de la marca (la de serie en minúsculas, como el dominio: «kargia»). */
export function BrandWordmark({ className }: { className?: string; plain?: boolean }) {
  const { name } = useBrand();
  return <span className={className}>{name === "Kargia" ? "kargia" : name}</span>;
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
