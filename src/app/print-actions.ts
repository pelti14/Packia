"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { PRINT_FORMATS } from "@/lib/labels/print";
import type { FormState } from "@/app/actions";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const num = (v: string, min: number, max: number) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/** Impresora de etiquetas: formato, calibración y comportamiento. */
export async function savePrintSettings(_: FormState, form: FormData): Promise<FormState> {
  await assertRole(["ADMIN", "STAFF"]);
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const format = str(form.get("printFormat"));
  if (!(format in PRINT_FORMATS)) return { error: "Elige el tipo de impresora", values };
  const offsetX = num(str(form.get("printOffsetX")) || "0", -20, 20);
  const offsetY = num(str(form.get("printOffsetY")) || "0", -20, 20);
  const scale = num(str(form.get("printScale")) || "100", 50, 150);
  if (offsetX === null || offsetY === null || scale === null) return { error: "Revisa los números de calibración", values };
  const sort = str(form.get("printSort"));
  const data = {
    printFormat: format,
    printOffsetX: offsetX,
    printOffsetY: offsetY,
    printScale: Math.round(scale),
    printRotate180: form.get("printRotate180") === "on",
    printAutoDialog: form.get("printAutoDialog") === "on",
    printSort: ["CLIENT", "CARRIER", "TIME"].includes(sort) ? sort : "CARRIER",
  };
  await db.appSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/etiquetas");
  return { success: "Impresora guardada. Imprime una página de prueba para comprobarla.", values };
}

/** Marcar como impresas sin imprimir, o devolverlas a «Por imprimir». */
export async function setPrinted(printed: boolean, form: FormData) {
  await assertRole(["ADMIN", "STAFF"]);
  const ids = form.getAll("ids").map(String).filter(Boolean).slice(0, 500);
  if (!ids.length) return;
  await db.order.updateMany({ where: { id: { in: ids } }, data: { labelPrintedAt: printed ? new Date() : null } });
  revalidatePath("/", "layout");
}
