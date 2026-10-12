"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { listShippingMethods } from "@/lib/labels/sendcloud";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

const TEXT_FIELDS = [
  "companyName", "companyTaxId", "companyAddress", "companyEmail", "companyIban",
  "senderName", "senderAddress", "senderCity", "senderZip", "senderCountry", "senderPhone", "senderEmail",
] as const;

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const data: Record<string, string | null> = {};
  for (const f of TEXT_FIELDS) data[f] = str(form.get(f)) || null;
  if (data.senderCountry) data.senderCountry = data.senderCountry.toUpperCase().slice(0, 2);

  // Claves de Sendcloud: en blanco = se mantienen; "borrar" las elimina.
  const pk = str(form.get("sendcloudPublicKey"));
  const sk = str(form.get("sendcloudSecretKey"));
  if (form.get("clearSendcloud")) {
    data.sendcloudPublicKey = null;
    data.sendcloudSecretKey = null;
  } else {
    if (pk) data.sendcloudPublicKey = encrypt(pk);
    if (sk) data.sendcloudSecretKey = encrypt(sk);
  }

  const autoInvoice = form.get("autoInvoice") === "on";
  await db.appSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data, autoInvoice }, update: { ...data, autoInvoice } });
  revalidatePath("/", "layout");
  const values = Object.fromEntries(TEXT_FIELDS.map((f) => [f, data[f] ?? ""]));
  return { success: "Ajustes guardados", values };
}

/** Prueba las claves escritas (o las guardadas) pidiendo los métodos de envío. */
export async function testSendcloud(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const saved = (await getSettings()).sendcloud;
  const keys = {
    publicKey: str(form.get("sendcloudPublicKey")) || saved.publicKey,
    secretKey: str(form.get("sendcloudSecretKey")) || saved.secretKey,
  };
  if (!keys.publicKey || !keys.secretKey) return { error: "Introduce las dos claves de Sendcloud" };
  try {
    const methods = await listShippingMethods(keys);
    return { success: `Conectado: ${methods.length} métodos de envío disponibles${methods.length ? ` (${methods.slice(0, 3).map((m) => m.name).join(", ")}…)` : ""}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
