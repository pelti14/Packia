"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { adminExists, applyMigrations, pendingMigrations } from "@/lib/setup";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

async function hasAdmin() {
  try {
    return await adminExists();
  } catch {
    return false; // aún no hay tablas
  }
}

/** Crea o actualiza las tablas. Si ya hay administrador, solo él puede hacerlo. */
export async function runMigrations(): Promise<FormState> {
  if (await hasAdmin()) await assertRole(["ADMIN"]);
  try {
    const applied = await applyMigrations();
    revalidatePath("/setup");
    revalidatePath("/ajustes");
    return { success: applied.length ? `Aplicadas: ${applied.join(", ")}` : "Las tablas ya estaban al día" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Primer administrador. Deja de funcionar en cuanto existe uno. */
export async function createFirstAdmin(_: FormState, form: FormData): Promise<FormState> {
  const values = { email: str(form.get("email")).toLowerCase(), name: str(form.get("name")) };
  const password = str(form.get("password"));
  if (await hasAdmin()) return { error: "Ya existe un administrador. Inicia sesión." };
  if ((await pendingMigrations()).length) return { error: "Primero crea las tablas (paso 3).", values };
  if (!values.email || password.length < 8) return { error: "Email y contraseña de al menos 8 caracteres", values };
  if (password !== str(form.get("confirm"))) return { error: "Las contraseñas no coinciden", values };

  const admin = createSupabaseAdmin();
  let userId: string | undefined;
  const created = await admin.auth.admin.createUser({ email: values.email, password, email_confirm: true, user_metadata: { name: values.name } });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // Ya existía en Supabase (p. ej. creado a mano): lo reutilizamos.
    const list = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list.data?.users.find((u) => u.email?.toLowerCase() === values.email);
    if (!existing) return { error: `Supabase: ${created.error?.message ?? "no se pudo crear el usuario"}`, values };
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  await db.profile.upsert({
    where: { id: userId },
    create: { id: userId, email: values.email, name: values.name || null, role: "ADMIN" },
    update: { role: "ADMIN", clientId: null, name: values.name || undefined },
  });

  const supabase = await createSupabaseServer();
  await supabase.auth.signInWithPassword({ email: values.email, password });
  redirect("/ajustes?bienvenida=1");
}
