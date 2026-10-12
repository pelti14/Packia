import { db } from "@/lib/db";
import { clientScope, requireUser } from "@/lib/auth";
import { BackLink, PageHeader } from "@/components/ui";
import { InboundForm } from "./inbound-form";

export default async function NewInboundPage() {
  const user = await requireUser();
  const scope = clientScope(user);
  const [clients, products] = await Promise.all([
    db.client.findMany({ where: scope.clientId ? { id: scope.clientId } : undefined, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: scope, select: { clientId: true, sku: true, name: true }, orderBy: { sku: "asc" } }),
  ]);
  return (
    <>
      <BackLink href="/recepcion">Recepción</BackLink>
      <PageHeader eyebrow="Recepción" title="Nuevo aviso de entrada" description="Indica qué mercancía va a llegar al almacén. Al recibirla, el equipo la cuenta y entra en el stock." />
      <InboundForm clients={clients} products={products} fixedClientId={user.role === "CLIENT" ? user.clientId ?? undefined : undefined} />
    </>
  );
}
