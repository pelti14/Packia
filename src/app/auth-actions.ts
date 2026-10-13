"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RateLimiter, safeRedirectPath } from "@/lib/security";
import { notify } from "@/lib/notifications";
import { getAppUrl } from "@/lib/app-url";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

// Fuerza bruta: 5 fallos por email e IP, o 20 por IP, en 15 minutos → bloqueo temporal.
const WINDOW = 15 * 60_000;
const perAccount = new RateLimiter(5, WINDOW);
const perIp = new RateLimiter(20, WINDOW);
const resets = new RateLimiter(5, WINDOW);

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "desconocida").trim();
}

const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get("email")).toLowerCase().slice(0, 200);
  const password = str(form.get("password"));
  if (!email || !password) return { error: "Introduce email y contraseña", values: { email } };

  const ip = await clientIp();
  const accountKey = `${email}|${ip}`;
  const a = perAccount.check(accountKey);
  const b = perIp.check(ip);
  if (a.blocked || b.blocked) {
    return { error: `Demasiados intentos fallidos. Espera ${minutes(Math.max(a.retryAfterMs, b.retryAfterMs))} min o recupera la contraseña.`, values: { email } };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    perAccount.fail(accountKey);
    perIp.fail(ip);
    console.warn(`[login] intento fallido · ${email} · IP ${ip}`);
    if (perAccount.check(accountKey).blocked) {
      await notify({ title: "Acceso bloqueado temporalmente", body: `${email}: 5 intentos fallidos desde la IP ${ip}`, href: "/usuarios", tone: "danger" });
    }
    return { error: "Email o contraseña incorrectos", values: { email } };
  }
  perAccount.reset(accountKey);
  redirect(safeRedirectPath(str(form.get("next"))));
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get("email")).toLowerCase();
  if (!email) return { error: "Introduce tu email" };
  const ip = await clientIp();
  if (resets.check(ip).blocked) return { error: "Has pedido demasiados enlaces. Inténtalo dentro de unos minutos." };
  resets.fail(ip);
  const origin = await getAppUrl();
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
