"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BadgePercent, Boxes, Contact, Presentation, Printer, LayoutDashboard, LogOut, PackagePlus, Plug, Receipt, RotateCcw, Settings, ShieldCheck, Truck, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useNotifications } from "@/components/notifications";
import type { Badge, Badges } from "@/lib/notifications";
import { Logo } from "@/components/logo";
import { signOut } from "@/app/auth-actions";
import type { Role } from "@/lib/auth";
import { BrandName } from "@/components/brand";

type Item = { href: string; label: string; icon: LucideIcon; roles: Role[]; badge?: keyof Badges };

const ALL: Role[] = ["ADMIN", "STAFF", "CLIENT"];

const OPERATIONS: Item[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard, roles: ALL },
  { href: "/salida", label: "Salida", icon: Truck, roles: ALL, badge: "salida" },
  { href: "/etiquetas", label: "Etiquetas", icon: Printer, roles: ["ADMIN", "STAFF"], badge: "etiquetas" },
  { href: "/recepcion", label: "Recepción", icon: PackagePlus, roles: ALL, badge: "recepcion" },
  { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw, roles: ALL, badge: "devoluciones" },
  { href: "/inventario", label: "Inventario", icon: Boxes, roles: ALL, badge: "inventario" },
  { href: "/clientes-tienda", label: "Clientes tienda", icon: Contact, roles: ["ADMIN", "STAFF"] },
];

const BUSINESS: Item[] = [
  { href: "/facturacion", label: "Facturación", icon: Receipt, roles: ["ADMIN", "CLIENT"] },
  { href: "/mi-plan", label: "Mi plan", icon: BadgePercent, roles: ["CLIENT"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["ADMIN", "STAFF"] },
  { href: "/tiendas", label: "Tiendas", icon: Plug, roles: ["ADMIN", "STAFF"], badge: "tiendas" },
  { href: "/usuarios", label: "Usuarios", icon: ShieldCheck, roles: ["ADMIN"] },
  { href: "/ajustes", label: "Ajustes", icon: Settings, roles: ["ADMIN"] },
  { href: "/demo", label: "Modo demo", icon: Presentation, roles: ["ADMIN", "STAFF"] },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

function NavLink({ item, active, badge, onNavigate }: { item: Item; active: boolean; badge?: Badge; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={clsx(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-ink-900 text-white shadow-[0_8px_20px_-10px_rgb(11_11_13/0.6)]"
          : "text-ink-500 hover:bg-white/80 hover:text-ink-900",
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-400" />}
      <Icon className={clsx("h-[18px] w-[18px]", active ? "text-brand-400" : "text-ink-400 group-hover:text-ink-700")} />
      {item.label}
      {badge && (
        <span
          className={clsx(
            "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white",
            badge.tone === "red" ? "bg-rose-500 shadow-[0_0_0_3px_rgb(240_71_106/0.15)]" : "bg-mint-500 shadow-[0_0_0_3px_rgb(34_201_147/0.15)]",
          )}
          title={badge.tone === "red" ? "Hay tareas urgentes" : "Tareas pendientes"}
        >
          {badge.count > 99 ? "99+" : badge.count}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ role, user }: { role: Role; user: { name: string; detail: string } }) {
  const pathname = usePathname();
  const { badges } = useNotifications().state;
  const business = BUSINESS.filter((i) => i.roles.includes(role));
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/70 bg-white/55 px-4 py-6 backdrop-blur-xl print:hidden lg:flex">
      <div className="px-2"><Logo /></div>

      <nav className="mt-9 flex flex-col gap-1">
        <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Operación</div>
        {OPERATIONS.filter((i) => i.roles.includes(role)).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} badge={item.badge && badges[item.badge]} />
        ))}
        {!!business.length && <div className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Negocio</div>}
        {business.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} badge={item.badge && badges[item.badge]} />
        ))}
      </nav>

      <div className="mt-auto mb-2 px-3 text-[10px] font-medium text-ink-400"><BrandName /> v{process.env.NEXT_PUBLIC_APP_VERSION}</div>
      <div className="rounded-2xl border border-line bg-white/80 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-sm font-bold text-brand-400">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink-900">{user.name}</div>
            <div className="truncate text-[11px] text-ink-500">{user.detail}</div>
          </div>
          <form action={signOut}>
            <button className="rounded-lg p-2 text-ink-400 transition hover:bg-white hover:text-rose-500" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { badges } = useNotifications().state;
  const [open, setOpen] = useState(false);
  const all = [...OPERATIONS, ...BUSINESS].filter((i) => i.roles.includes(role));
  const main = OPERATIONS.filter((i) => i.roles.includes(role)).slice(0, 4);
  const rest = all.filter((i) => !main.includes(i));
  const restBadge = rest.some((i) => i.badge && badges[i.badge]);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm print:hidden lg:hidden" onClick={() => setOpen(false)}>
          <div className="glass absolute inset-x-3 bottom-20 max-h-[70vh] overflow-y-auto p-2" onClick={(e) => e.stopPropagation()}>
            {rest.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} badge={item.badge && badges[item.badge]} onNavigate={() => setOpen(false)} />
            ))}
            <div className="px-3 pt-2 text-[10px] text-ink-400"><BrandName /> v{process.env.NEXT_PUBLIC_APP_VERSION}</div>
          </div>
        </div>
      )}
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around px-2 py-2 print:hidden lg:hidden">
        {main.map(({ href, label, icon: Icon, badge }) => {
          const b = badge && badges[badge];
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx("relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium", isActive(pathname, href) ? "text-brand-600" : "text-ink-400")}
            >
              <Icon className="h-5 w-5" />
              {label}
              {b && <span className={clsx("absolute right-0 top-0 h-2.5 w-2.5 rounded-full ring-2 ring-white", b.tone === "red" ? "bg-rose-500" : "bg-mint-500")} />}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen((o) => !o)} className={clsx("relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium", open || rest.some((i) => isActive(pathname, i.href)) ? "text-brand-600" : "text-ink-400")} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          Más
          {restBadge && !open && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-mint-500 ring-2 ring-white" />}
        </button>
      </nav>
    </>
  );
}
