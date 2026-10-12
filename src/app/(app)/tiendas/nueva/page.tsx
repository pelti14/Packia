import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ConnectForm } from "./connect-form";
import { Users } from "lucide-react";

export default async function NewStorePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const clients = await db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <Link href="/tiendas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Tiendas
      </Link>
      <PageHeader eyebrow="Integraciones" title="Conectar tienda" description="Probamos la conexión antes de guardar e importamos sus productos y pedidos pendientes." />
      {clients.length ? (
        <ConnectForm clients={clients} defaultClient={client} />
      ) : (
        <Card>
          <EmptyState icon={Users} title="Primero crea un cliente">
            Cada tienda pertenece a un cliente. <Link href="/clientes" className="font-semibold text-brand-600 hover:underline">Crear cliente</Link>
          </EmptyState>
        </Card>
      )}
    </>
  );
}
