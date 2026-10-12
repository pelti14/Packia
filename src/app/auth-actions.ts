"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Solo rutas internas, para evitar redirecciones abiertas. */
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get("email")).toLowerCase();
  const password = str(form.get("password"));
  if (!email || !password) return { error: "Introduce email y contraseña", values: { email } };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos", values: { email } };
  redirect(safeNext(str(form.get("next")) || "/"));
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get("email")).toLowerCase();
  if (!email) return { error: "Introduce tu email" };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/cambiar-clave` });
  // Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados.
  return { success: "Si el email existe, te hemos enviado un enlace para crear una contraseña nueva." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = str(form.get("password"));
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== str(form.get("confirm"))) return { error: "Las contraseñas no coinciden" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/");
}
