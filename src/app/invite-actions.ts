"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { createInvite } from "@/lib/onboarding";
import { getPlans } from "@/lib/plans";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Crea un enlace de alta para una tienda (solo ADMIN). */
export async function createInviteAction(_: FormState, form: FormData): Promise<(NonNullable<FormState> & { token?: string }) | undefined> {
  const user = await assertRole(["ADMIN"]);
  const email = str(form.get("email")).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email no válido" };
  const plan = str(form.get("plan"));
  if (plan && !(await getPlans()).some((p) => p.plan === plan)) return { error: "Plan no válido" };
  const weeks = Number(str(form.get("trialWeeks")) || "2");
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 12) return { error: "Semanas de prueba: de 0 a 12" };
  const inv = await createInvite({ email, companyName: str(form.get("companyName")).slice(0, 120), plan, trialWeeks: weeks, createdBy: user.id });
  revalidatePath("/clientes");
  return { success: "Enlace creado. Cópialo y envíaselo.", token: inv.token };
}

export async function deleteInviteAction(id: string) {
  await assertRole(["ADMIN"]);
  await db.invite.deleteMany({ where: { id, usedAt: null } });
  revalidatePath("/clientes");
}

/** Alta abierta (cualquiera con el enlace /alta) y semanas de prueba por defecto. */
export async function saveSignupSettings(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const openSignup = form.get("openSignup") === "on";
  const weeks = Number(str(form.get("defaultTrialWeeks")) || "2");
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 12) return { error: "Semanas de prueba: de 0 a 12" };
  await db.appSettings.upsert({ where: { id: "default" }, create: { id: "default", openSignup, defaultTrialWeeks: weeks }, update: { openSignup, defaultTrialWeeks: weeks } });
  revalidatePath("/clientes");
  return { success: openSignup ? "Alta abierta activada" : "Guardado: solo con invitación" };
}
