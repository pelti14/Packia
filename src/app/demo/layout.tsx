import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo" };

/** Modo demo: solo administradores y equipo. Todo es ficticio y no toca la base de datos. */
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["ADMIN", "STAFF"]);
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 bg-ink-900 px-4 py-2 text-sm text-white sm:px-8">
        <span className="font-semibold">Modo demo · datos de ejemplo, no se guarda nada · solo lo ve el equipo</span>
        <Link href="/" className="rounded-lg bg-brand-400 px-3 py-1 font-semibold text-ink-900 hover:bg-brand-300">Salir de la demo</Link>
      </div>
      <div className="relative">
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative px-4 pb-16 pt-6 sm:px-8 lg:px-10">
          <div className="mb-6"><Logo /></div>
          {children}
        </div>
      </div>
    </div>
  );
}
