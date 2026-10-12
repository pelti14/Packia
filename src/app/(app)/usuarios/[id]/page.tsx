import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BackLink, PageHeader } from "@/components/ui";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser(["ADMIN"]);
  const { id } = await params;
  const [profile, clients] = await Promise.all([
    db.profile.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, clientId: true } }),
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!profile) notFound();
  return (
    <>
      <BackLink href="/usuarios">Usuarios</BackLink>
      <PageHeader eyebrow="Usuarios" title={profile.name ?? profile.email} description="Cambia sus datos, su rol o su contraseña." />
      <EditUserForm
        id={profile.id}
        isMe={profile.id === me.id}
        clients={clients}
        initial={{ email: profile.email, name: profile.name ?? "", role: profile.role, clientId: profile.clientId ?? "" }}
      />
    </>
  );
}
