"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { findInvite, signupOpen } from "@/lib/onboarding";
import { getPlans } from "@/lib/plans";
import { notify } from "@/lib/notifications";
import { RateLimiter } from "@/lib/security";
import { RETURN_FEE_CENTS } from "@/lib/types";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const limiter = new RateLimiter(5, 60 * 60_000);

/**
 * Alta autoservicio de una tienda (pública): con invitación válida, o sin ella si
 * «alta abierta» está activada en Ajustes. Crea la empresa (en prueba) y su usuario.
 */
export async function signupAction(inviteToken: string, _: FormState, form: FormData): Promise<FormState> {
  const fields = ["company", "name", "email", "phone", "storeUrl", "monthlyOrders", "plan"];
  const values = Object.fromEntries(fields.map((f) => [f, str(form.get(f))]));
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (limiter.check(ip).blocked) return { error: "Demasiados intentos. Prueba dentro de un rato.", values };
  limiter.fail(ip);

  const invite = await findInvite(inviteToken);
  const { open, trialWeeks } = await signupOpen();
  if (!invite && !open) return { error: "Este enlace de alta no es válido o ha caducado. Pídenos uno nuevo.", values };

  const email = values.email.toLowerCase();
  const password = str(form.get("password"));
  if (!values.company || !values.name) return { error: "Indica empresa y tu nombre", values };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email no válido", values };
  if (invite?.email && invite.email !== email) return { error: `Esta invitación es para ${invite.email}`, values };
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres", values };
  if (form.get("terms") !== "on") return { error: "Acepta las condiciones y la política de privacidad", values };
  if (await db.profile.findFirst({ where: { email } })) return { error: "Ya hay una cuenta con ese email. Inicia sesión.", values };

  const plans = await getPlans();
  const p = plans.find((x) => x.plan === (invite?.plan || values.plan)) ?? plans[0];
  const supa = createSupabaseAdmin();
  const { data, error } = await supa.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: values.name } });
  if (error || !data.user) return { error: `No se pudo crear la cuenta: ${error?.message ?? "error"}`, values };

  const client = await db.client.create({
    data: {
      name: values.company.slice(0, 120),
      contactEmail: email,
      plan: p.plan,
      planOrders: p.orders,
      monthlyFeeCents: p.feeCents,
      extraOrderFeeCents: p.extraCents,
      returnFeeCents: RETURN_FEE_CENTS,
      serviceStartAt: new Date(),
      trialWeeks: invite?.trialWeeks ?? trialWeeks,
      publicName: values.company.slice(0, 120),
    },
  });
  await db.profile.create({ data: { id: data.user.id, email, name: values.name, role: "CLIENT", clientId: client.id } });
  if (invite) await db.invite.update({ where: { id: invite.id }, data: { usedAt: new Date(), clientId: client.id } });
  await notify({
    title: `Nueva tienda dada de alta: ${client.name}`,
    body: [values.storeUrl, values.monthlyOrders && `${values.monthlyOrders} pedidos/mes`, values.phone].filter(Boolean).join(" · "),
    href: `/clientes/${client.id}`,
    tone: "success",
  });

  const supabase = await createSupabaseServer();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/bienvenida");
}
