import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessClient, requireUser } from "@/lib/auth";
import { parseEvents } from "@/lib/tracking";
import { mailConfigured } from "@/lib/mailer";
import { PageHeader } from "@/components/ui";
import { BuyerBrandForm } from "./brand-form";

/** Marca para el comprador final. El cliente edita la suya; el admin entra con ?c=ID desde la ficha del cliente. */
export default async function MiMarcaPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser(["ADMIN", "CLIENT"]);
  const { c } = await searchParams;
  const clientId = user.role === "CLIENT" ? user.clientId : c;
  if (!clientId || !canAccessClient(user, clientId)) notFound();
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();
  return (
    <>
      <PageHeader
        eyebrow={user.role === "CLIENT" ? "Mi cuenta" : client.name}
        title="Mi marca para los compradores"
        description="Tu logo y tu color en la página de seguimiento y en los avisos por email. El comprador ve tu tienda, no a nosotros."
      />
      <BuyerBrandForm
        clientId={client.id}
        mailReady={mailConfigured()}
        initial={{
          trackingEnabled: client.trackingEnabled,
          publicName: client.publicName ?? "",
          clientName: client.name,
          hasLogo: Boolean(client.publicLogo),
          logoSrc: client.publicLogo,
          publicColor: client.publicColor ?? "#0B0B0D",
          publicReplyTo: client.publicReplyTo ?? "",
          publicMessage: client.publicMessage ?? "",
          notifyBuyer: client.notifyBuyer,
          buyerEvents: [...parseEvents(client.buyerEvents)],
        }}
      />
    </>
  );
}
