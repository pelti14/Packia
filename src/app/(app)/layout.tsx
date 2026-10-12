import Link from "next/link";
import { Presentation, Search } from "lucide-react";
import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { getBadges } from "@/lib/notifications";
import { NotificationBell, NotificationsProvider } from "@/components/notifications";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { CutoffClock } from "@/components/cutoff-clock";
import { pendingMigrations } from "@/lib/setup";
import { UpdateScreen } from "@/components/update-screen";
import { PrintToast } from "@/components/print-toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Nueva versión desplegada con cambios de base de datos aún sin aplicar.
  const pending = await pendingMigrations().catch(() => []);
  if (pending.length) return <UpdateScreen isAdmin={user.role === "ADMIN"} count={pending.length} />;
  const badges = await getBadges(user);

  return (
    <NotificationsProvider initialBadges={badges}>
    <div className="flex min-h-screen">
      <Sidebar
        role={user.role}
        user={{ name: user.name || user.email, detail: user.clientName ? `${user.clientName} · ${ROLE_LABEL[user.role]}` : ROLE_LABEL[user.role] }}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 print:hidden" />
        <header className="relative z-30 flex items-center justify-between gap-4 px-4 pt-5 print:hidden sm:px-8 lg:px-10">
          <form action="/salida" className="glass flex w-full max-w-sm items-center gap-2 rounded-xl px-3.5 py-2">
            <input type="hidden" name="tab" value="ALL" />
            <Search className="h-4 w-4 text-ink-400" />
            <input name="q" placeholder="Buscar pedido, destinatario o SKU…" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400" />
          </form>
          <div className="flex items-center gap-3">
            {user.role !== "CLIENT" && (
              <Link href="/demo" className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-600 hover:text-brand-700" title="Modo demo para enseñar la app a un cliente">
                <Presentation className="h-4 w-4" /> <span className="hidden md:inline">Demo</span>
              </Link>
            )}
            <div className="hidden sm:block">
              <CutoffClock />
            </div>
            <NotificationBell />
          </div>
        </header>
        <main className="relative z-10 flex-1 px-4 pb-28 pt-8 print:p-0 sm:px-8 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <MobileNav role={user.role} />
      <PrintToast />
    </div>
    </NotificationsProvider>
  );
}
