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

/** Precios de los planes. Opcionalmente se aplican también a los clientes que ya tienen ese plan. */
export async function savePlans(_: FormState, form: FormData): Promise<FormState> {
  const admin = await assertRole(["ADMIN"]);
  const { changeTerms, getPlans, nextMonthStart } = await import("@/lib/plans");
  const { startOfDay } = await import("@/lib/schedule");
  const plans = await getPlans();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const toCents = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };
  const updates = [];
  for (const [i, p] of plans.entries()) {
    const label = str(form.get(`label_${p.plan}`)) || p.label;
    const orders = Number(str(form.get(`orders_${p.plan}`)));
    const feeCents = toCents(str(form.get(`fee_${p.plan}`)));
    const extraCents = toCents(str(form.get(`extra_${p.plan}`)));
    if (!Number.isInteger(orders) || orders <= 0 || feeCents === null || extraCents === null) return { error: `Revisa los datos del plan ${p.label}`, values };
    updates.push({ key: p.plan, label, orders, feeCents, extraCents, sortOrder: i + 1 });
  }
  for (const u of updates) {
    await db.planConfig.upsert({ where: { key: u.key }, create: u, update: { label: u.label, orders: u.orders, feeCents: u.feeCents, extraCents: u.extraCents } });
  }

  const apply = str(form.get("apply"));
  let applied = 0;
  if (apply === "today" || apply === "next") {
    const by = admin.name || admin.email;
    const clients = await db.client.findMany({ where: { plan: { in: updates.map((u) => u.key) }, OR: [{ serviceEndAt: null }, { serviceEndAt: { gte: startOfDay() } }] } });
    for (const c of clients) {
      const u = updates.find((x) => x.key === c.plan)!;
      const terms = { plan: u.key, orders: u.orders, feeCents: u.feeCents, extraCents: u.extraCents };
      if (apply === "today") {
        if (await changeTerms(c.id, terms, startOfDay(), "SETTINGS", by)) applied++;
      } else if (c.planOrders !== u.orders || c.monthlyFeeCents !== u.feeCents || c.extraOrderFeeCents !== u.extraCents) {
        await db.planRequest.updateMany({ where: { clientId: c.id, status: "PENDING", type: "CHANGE" }, data: { status: "WITHDRAWN", resolvedAt: new Date(), resolvedBy: by } });
        await db.planRequest.create({ data: { clientId: c.id, type: "CHANGE", plan: u.key, orders: u.orders, feeCents: u.feeCents, extraCents: u.extraCents, effectiveAt: nextMonthStart(), createdBy: by } });
        applied++;
      }
    }
  }
  revalidatePath("/", "layout");
  return {
    success: applied
      ? `Precios guardados y aplicados a ${applied} ${applied === 1 ? "cliente" : "clientes"} ${apply === "today" ? "desde hoy (prorrateado)" : "desde el día 1 del mes que viene"}`
      : "Precios guardados. Se usarán para los clientes nuevos y los cambios de plan",
  };
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Marca comercial: nombre, texto bajo el nombre y logo. Se ve en toda la app y en la web de GoHighLevel. */
export async function saveBrand(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const name = str(form.get("brandName")).slice(0, 40);
  const tagline = str(form.get("brandTagline")).slice(0, 40);
  const values = { brandName: name, brandTagline: tagline };
  const data: { brandName: string | null; brandTagline: string | null; brandLogo?: string | null } = { brandName: name || null, brandTagline: tagline || null };

  const file = form.get("brandLogo");
  if (form.get("removeLogo")) {
    data.brandLogo = null;
  } else if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return { error: "El logo tiene que ser PNG, JPG, WEBP o SVG", values };
    if (file.size > 300 * 1024) return { error: "El logo pesa demasiado (máximo 300 KB)", values };
    const bytes = Buffer.from(await file.arrayBuffer());
    if (file.type === "image/svg+xml" && /<script|on\w+\s*=|javascript:/i.test(bytes.toString("utf8"))) return { error: "Ese SVG contiene código: expórtalo de nuevo como imagen limpia o usa PNG", values };
    data.brandLogo = `data:${file.type};base64,${bytes.toString("base64")}`;
  }
  await db.appSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/", "layout");
  return { success: name ? `Marca guardada: ${name}` : "Marca guardada (se usa «Kargia»)", values };
}
