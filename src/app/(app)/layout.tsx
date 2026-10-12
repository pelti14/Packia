import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { CutoffClock } from "@/components/cutoff-clock";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const pending = await db.order.count({ where: { status: { in: ["PENDING", "PICKING", "PACKED"] } } });
  return (
    <div className="flex min-h-screen">
      <Sidebar pending={pending} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
        <header className="relative z-10 flex items-center justify-between gap-4 px-4 pt-5 sm:px-8 lg:px-10">
          <form action="/pedidos" className="glass flex w-full max-w-sm items-center gap-2 rounded-xl px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-400" />
            <input name="q" placeholder="Buscar pedido, cliente o SKU…" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400" />
          </form>
          <div className="hidden sm:block">
            <CutoffClock />
          </div>
        </header>
        <main className="relative z-10 flex-1 px-4 pb-28 pt-8 sm:px-8 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
