"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { SAMPLE_SERVICES, WEIGHT_BANDS, ZONES, type Rates } from "@/lib/shipping";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const toCents = (v: string) => {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Crear o editar un servicio de transporte con su tarifa. */
export async function saveCarrierService(serviceId: string | null, _: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const name = str(form.get("name"));
  const carrier = str(form.get("carrier"));
  const labelMethod = str(form.get("labelMethod"));
  const transitDays = Number(str(form.get("transitDays")));
  const maxKg = Number(str(form.get("maxKg")).replace(",", "."));
  if (!name || !carrier) return { error: "Pon nombre y agencia", values };
  if (!/^(packia:[\w .-]+|sendcloud:\d+)$/.test(labelMethod)) return { error: "Elige cómo se crea la etiqueta", values };
  if (!Number.isInteger(transitDays) || transitDays < 0 || transitDays > 30) return { error: "Días de tránsito no válidos", values };
  if (!Number.isFinite(maxKg) || maxKg <= 0 || maxKg > 100) return { error: "Peso máximo no válido", values };

  const rates: Rates = {};
  for (const z of ZONES) {
    for (const band of WEIGHT_BANDS) {
      const c = toCents(str(form.get(`rate_${z.key}_${band}`)));
      if (c === null) continue;
      if (Number.isNaN(c)) return { error: `Precio no válido en ${z.label} hasta ${band / 1000} kg`, values };
      (rates[z.key] ??= {})[String(band)] = c;
    }
  }
  if (!Object.keys(rates).length) return { error: "Pon al menos un precio en la tarifa", values };

  const data = { name, carrier, labelMethod, transitDays, maxWeightGrams: Math.round(maxKg * 1000), rates, active: form.get("active") === "on" };
  if (serviceId) await db.carrierService.update({ where: { id: serviceId }, data });
  else await db.carrierService.create({ data: { ...data, sortOrder: (await db.carrierService.count()) + 1 } });
  revalidatePath("/transporte");
  return { success: serviceId ? "Servicio guardado" : "Servicio creado", values };
}

export async function deleteCarrierService(serviceId: string) {
  await assertRole(["ADMIN"]);
  await db.carrierService.delete({ where: { id: serviceId } });
  revalidatePath("/transporte");
}

/** Carga 4 servicios de ejemplo para empezar (se pueden editar o borrar). */
export async function loadSampleServices() {
  await assertRole(["ADMIN"]);
  if (await db.carrierService.count()) return;
  await db.carrierService.createMany({ data: SAMPLE_SERVICES.map((s, i) => ({ ...s, maxWeightGrams: 30000, sortOrder: i + 1 })) });
  revalidatePath("/transporte");
}

/** Margen general por envío. */
export async function saveShippingMarkup(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const c = toCents(str(form.get("markup")));
  if (c === null || Number.isNaN(c) || c > 5000) return { error: "Margen no válido" };
  await db.appSettings.upsert({ where: { id: "default" }, create: { id: "default", shippingMarkupCents: c }, update: { shippingMarkupCents: c } });
  revalidatePath("/transporte");
  return { success: "Margen guardado" };
}
