import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "ADMIN" | "STAFF" | "CLIENT";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  STAFF: "Almacén",
  CLIENT: "Cliente",
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  clientId: string | null;
  clientName: string | null;
};

/** Usuario de la petición actual (o null). Se cachea durante la petición. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await db.profile.findUnique({ where: { id: user.id }, include: { client: true } });
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as Role,
    clientId: profile.clientId,
    clientName: profile.client?.name ?? null,
  };
});

/** Exige sesión y, opcionalmente, uno de los roles indicados. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Sin sesión el middleware ya redirige; aquí llega quien tiene sesión pero no perfil en Packia.
    redirect("/auth/signout?error=sin-perfil");
  }
  if (roles && !roles.includes(user.role)) redirect("/?error=sin-permiso");
  return user;
}

export const isStaff = (u: CurrentUser) => u.role === "ADMIN" || u.role === "STAFF";

/** Filtro por cliente: un usuario CLIENT solo ve los datos de su empresa. */
export function clientScope(u: CurrentUser): { clientId?: string } {
  if (u.role === "CLIENT") return { clientId: u.clientId ?? "__none__" };
  return {};
}

/** Para Server Actions: lanza en lugar de redirigir. */
export async function assertRole(roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) throw new Error("No tienes permiso para esta acción");
  return user;
}

/** Comprueba que un recurso de un cliente es accesible por el usuario. */
export function canAccessClient(u: CurrentUser, clientId: string) {
  return u.role !== "CLIENT" || u.clientId === clientId;
}
