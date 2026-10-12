"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Boxes, LayoutDashboard, PackageCheck, Plug, Users } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: PackageCheck },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/tiendas", label: "Tiendas", icon: Plug },
];

export function Sidebar({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/70 bg-white/55 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-gradient-to-r from-brand-50 to-white text-brand-700 shadow-[inset_0_0_0_1px_var(--color-brand-100)]"
                  : "text-ink-500 hover:bg-white/80 hover:text-ink-900",
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-brand-500 to-aqua-500" />}
              <Icon className={clsx("h-[18px] w-[18px]", active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-700")} />
              {label}
              {href === "/pedidos" && pending > 0 && (
                <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">{pending}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-aqua-50 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
          <span className="h-2 w-2 rounded-full bg-mint-500 animate-pulse-dot" />
          Almacén operativo
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
          Recogida diaria de las agencias. Hora de corte: <b className="text-ink-700">14:00</b>
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around px-2 py-2 lg:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx("flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium", active ? "text-brand-600" : "text-ink-400")}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
