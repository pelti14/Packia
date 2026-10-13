"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, canAccessClient } from "@/lib/auth";
import { BUYER_EVENTS, isHexColor, sendTestBuyerEmail } from "@/lib/tracking";
import { mailConfigured } from "@/lib/mailer";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Marca que ve el comprador final (página de seguimiento y emails). La tienda edita la suya; el admin, cualquiera. */
export async function saveBuyerBrand(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await assertRole(["ADMIN", "CLIENT"]);
  if (!canAccessClient(user, clientId)) throw new Error("No tienes permiso para esta acción");
  const color = str(form.get("publicColor"));
  if (color && !isHexColor(color)) return { error: "El color tiene que ser tipo #12AB34" };
  const replyTo = str(form.get("publicReplyTo")).toLowerCase();
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return { error: "Email de respuesta no válido" };
  const notifyBuyer = str(form.get("notifyBuyer")) === "KARGIA" ? "KARGIA" : "STORE";
  const events = BUYER_EVENTS.filter((e) => form.get(`event_${e}`) === "on");
  const data: Record<string, unknown> = {
    trackingEnabled: form.get("trackingEnabled") === "on",
    publicName: str(form.get("publicName")).slice(0, 80) || null,
    publicColor: color || null,
    publicReplyTo: replyTo || null,
    publicMessage: str(form.get("publicMessage")).slice(0, 400) || null,
    notifyBuyer,
    buyerEvents: events.join(","),
  };
  const file = form.get("publicLogo");
  if (form.get("removeLogo")) data.publicLogo = null;
  else if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return { error: "El logo tiene que ser PNG, JPG, WEBP o SVG" };
    if (file.size > 300 * 1024) return { error: "El logo pesa demasiado (máximo 300 KB)" };
    const bytes = Buffer.from(await file.arrayBuffer());
    if (file.type === "image/svg+xml" && /<script|on\w+\s*=|javascript:/i.test(bytes.toString("utf8"))) return { error: "Ese SVG contiene código: usa PNG" };
    data.publicLogo = `data:${file.type};base64,${bytes.toString("base64")}`;
  }
  await db.client.update({ where: { id: clientId }, data });
  revalidatePath("/mi-marca");
  revalidatePath("/bienvenida");
  return { success: "Guardado" };
}

/** Envía un email de ejemplo al usuario que lo pide. */
export async function sendBuyerTestEmail(clientId: string, _: FormState): Promise<FormState> {
  const user = await assertRole(["ADMIN", "CLIENT"]);
  if (!canAccessClient(user, clientId)) throw new Error("No tienes permiso para esta acción");
  if (!mailConfigured()) return { error: "El envío de emails aún no está configurado (variables SMTP en Hostinger)." };
  try {
    await sendTestBuyerEmail(clientId, user.email);
    return { success: `Email de prueba enviado a ${user.email}` };
  } catch (err) {
    return { error: `No se pudo enviar: ${err instanceof Error ? err.message : String(err)}` };
  }
}
