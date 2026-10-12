import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BackLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { ConnectForm } from "./connect-form";
import { Users } from "lucide-react";

export default async function NewStorePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  await requireUser(["ADMIN"]);
  const { client } = await searchParams;
  const clients = await db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <BackLink href="/tiendas">Tiendas</BackLink>
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
