import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, ROLE_LABEL, type Role } from "@/lib/auth";
import { deleteUser } from "@/app/actions";
import { formatDateOnly } from "@/lib/format";
import { Card, CardHeader, PageHeader, Pill } from "@/components/ui";
import { UserForm } from "./user-form";

const TONE = { ADMIN: "brand", STAFF: "aqua", CLIENT: "ink" } as const;

export default async function UsersPage() {
  const me = await requireUser(["ADMIN"]);
  const [profiles, clients] = await Promise.all([
    db.profile.findMany({ include: { client: true }, orderBy: [{ role: "asc" }, { email: "asc" }] }),
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Negocio" title="Usuarios" description="Quién entra en Packia. Las cuentas se guardan en Supabase Auth; aquí se asigna el rol y, a los clientes, su empresa." />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <table className="w-full">
            <thead className="border-b border-line/70 bg-white/40">
              <tr>
                <th className="table-head">Usuario</th>
                <th className="table-head">Rol</th>
                <th className="table-head">Empresa</th>
                <th className="table-head">Alta</th>
                <th className="table-head" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="cell">
                    <div className="font-medium text-ink-900">{p.name ?? p.email}</div>
                    <div className="text-xs text-ink-400">{p.email}</div>
                  </td>
                  <td className="cell"><Pill tone={TONE[p.role as Role]}>{ROLE_LABEL[p.role as Role]}</Pill></td>
                  <td className="cell text-ink-700">{p.client?.name ?? "—"}</td>
                  <td className="cell text-ink-500">{formatDateOnly(p.createdAt)}</td>
                  <td className="cell text-right">
                    {p.id !== me.id && (
                      <form action={deleteUser.bind(null, p.id)}>
                        <button className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Eliminar ${p.email}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Nuevo usuario" />
          <UserForm clients={clients} />
        </Card>
      </div>
    </>
  );
}
