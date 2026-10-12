import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { STATUS_LABEL, type OrderStatus } from "@/lib/types";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</div>}
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("glass", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  brand: "from-brand-500 to-brand-400 text-brand-600 bg-brand-50",
  aqua: "from-aqua-500 to-aqua-400 text-aqua-600 bg-aqua-50",
  mint: "from-mint-500 to-aqua-400 text-mint-600 bg-mint-50",
  amber: "from-amber-500 to-amber-500 text-amber-600 bg-amber-50",
  rose: "from-rose-500 to-amber-500 text-rose-500 bg-rose-50",
} as const;

export function StatCard({ label, value, hint, icon: Icon, tone = "brand" }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={clsx("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", t.split(" ").slice(0, 2).join(" "))} />
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</div>
        <div className={clsx("rounded-xl p-2", t.split(" ").slice(2).join(" "))}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </Card>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600 ring-amber-500/20",
  PICKING: "bg-brand-50 text-brand-600 ring-brand-500/20",
  PACKED: "bg-aqua-50 text-aqua-600 ring-aqua-500/25",
  SHIPPED: "bg-mint-50 text-mint-600 ring-mint-500/25",
  CANCELLED: "bg-rose-50 text-rose-500 ring-rose-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", STATUS_STYLE[s])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function PlatformBadge({ platform, size = "sm" }: { platform: string; size?: "sm" | "md" }) {
  const shopify = platform === "SHOPIFY";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        shopify ? "bg-[#ecf8e8] text-[#3d7a28]" : "bg-[#f1ebfb] text-[#6b3fb0]",
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", shopify ? "bg-[#5e9e3e]" : "bg-[#7f54b3]")} />
      {shopify ? "Shopify" : "WooCommerce"}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-aqua-50 p-4 ring-1 ring-brand-100">
        <Icon className="h-6 w-6 text-brand-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-500">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-xl px-4 py-3 text-sm ring-1 ring-inset",
        tone === "error" && "bg-rose-50 text-rose-500 ring-rose-500/20",
        tone === "success" && "bg-mint-50 text-mint-600 ring-mint-500/20",
        tone === "info" && "bg-brand-50 text-brand-700 ring-brand-500/15",
      )}
    >
      {children}
    </div>
  );
}

export function Pill({ tone = "brand", children }: { tone?: "brand" | "aqua" | "mint" | "amber" | "rose" | "ink"; children: React.ReactNode }) {
  const styles = {
    brand: "bg-brand-50 text-brand-600 ring-brand-500/20",
    aqua: "bg-aqua-50 text-aqua-600 ring-aqua-500/25",
    mint: "bg-mint-50 text-mint-600 ring-mint-500/25",
    amber: "bg-amber-50 text-amber-600 ring-amber-500/20",
    rose: "bg-rose-50 text-rose-500 ring-rose-500/20",
    ink: "bg-line/60 text-ink-500 ring-ink-400/20",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", styles[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Pestañas como enlaces (filtros por URL). */
export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number; tone?: "rose" }[]; active: string }) {
  return (
    <div className="glass flex gap-1 overflow-x-auto rounded-xl p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            t.key === active ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-100" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={clsx(
                "mono rounded-md px-1.5 text-[11px]",
                t.tone === "rose" && t.count > 0 ? "bg-rose-50 text-rose-500" : t.key === active ? "bg-brand-50 text-brand-600" : "bg-line/60 text-ink-500",
              )}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 print:hidden">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}
