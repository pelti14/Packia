import Link from "next/link";
import { Plug, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { eur } from "@/lib/format";
import { startOfMonth } from "@/lib/format";
import { PLANS, type Plan } from "@/lib/types";
import { Card, CardHeader, EmptyState, PageHeader, PlatformBadge, SearchBar } from "@/components/ui";
import { NewClientForm } from "./new-client-form";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await requireUser(["ADMIN", "STAFF"]);
  const admin = user.role === "ADMIN";
  const clients = await db.client.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { contactEmail: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      stores: true,
      _count: { select: { products: true, orders: { where: { status: "SHIPPED", shippedAt: { gte: startOfMonth() } } } } },
    },
  });

  return (
    <>
      <PageHeader eyebrow="Negocio" title="Clientes" description="Las marcas a las que les hacemos la logística, su plan y el uso de este mes." />
      <div className="mb-6"><SearchBar placeholder="Buscar cliente…" defaultValue={q} /></div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className={admin ? "grid content-start gap-4 md:grid-cols-2 xl:col-span-2" : "grid content-start gap-4 md:grid-cols-2 xl:col-span-3"}>
          {clients.map((c) => {
            const used = c._count.orders;
            const pct = Math.min(100, Math.round((used / c.planOrders) * 100));
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 font-display text-lg font-bold text-white shadow-[var(--shadow-glow)]">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      {admin ? <Link href={`/clientes/${c.id}`} className="font-semibold text-ink-900 hover:text-brand-600">{c.name}</Link> : <div className="font-semibold text-ink-900">{c.name}</div>}
                      <div className="text-xs text-ink-400">{c.contactEmail ?? "Sin email"}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
                    {PLANS[c.plan as Plan]?.label ?? c.plan}
                  </span>
                </div>

                <div className="mt-5 flex items-baseline justify-between text-sm">
                  <span className="text-ink-500">Enviados este mes{admin && ` · ${eur(c.monthlyFeeCents)}/mes`}</span>
                  <span className="mono"><b className="text-ink-900">{used}</b> <span className="text-ink-400">/ {c.planOrders}</span></span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400" style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
                  {c.stores.map((s) => (
                    <Link key={s.id} href={`/tiendas/${s.id}`}><PlatformBadge platform={s.platform} size="md" /></Link>
                  ))}
                  {!c.stores.length && admin && (
                    <Link href={`/tiendas/nueva?client=${c.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline">
                      <Plug className="h-3.5 w-3.5" /> Conectar tienda
                    </Link>
                  )}
                  <span className="ml-auto text-xs text-ink-400">{c._count.products} referencias</span>
                </div>
              </Card>
            );
          })}
          {!clients.length && (
            <Card className="md:col-span-2"><EmptyState icon={Users} title="Aún no hay clientes">Crea el primero con el formulario.</EmptyState></Card>
          )}
        </div>

        {admin && (
          <Card className="h-fit">
            <CardHeader title="Nuevo cliente" subtitle="Tarifas por defecto del plan; ajústalas en su ficha" />
            <NewClientForm />
          </Card>
        )}
      </div>
    </>
  );
}
