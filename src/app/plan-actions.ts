"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { changeTerms, getPlans, monthLastDay, nextMonthStart } from "@/lib/plans";
import { startOfDay } from "@/lib/schedule";
import { formatDateOnly } from "@/lib/format";
import { safeRedirectPath } from "@/lib/security";

const str = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v.trim() : "");
const parseDay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : null);

/** Vuelve a la página con un aviso (?ok= o ?error=). */
function back(rawPath: string, key: "ok" | "error", text: string): never {
  revalidatePath("/", "layout");
  // El destino puede venir del navegador (argumento de la acción): solo rutas internas.
  const path = safeRedirectPath(rawPath);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(text)}`);
}

async function clientUser() {
  const user = await assertRole(["CLIENT"]);
  if (!user.clientId) throw new Error("Tu usuario no tiene empresa asignada");
  const client = await db.client.findUniqueOrThrow({ where: { id: user.clientId } });
  return { user, client, by: user.name || user.email };
}

// ─── El cliente ─────────────────────────────────────────────

/** Subir de plan: inmediato, prorrateado desde hoy. */
export async function upgradePlan(plan: string) {
  const { client, by } = await clientUser();
  const p = (await getPlans()).find((x) => x.plan === plan);
  if (!p || p.orders <= client.planOrders) back("/mi-plan", "error", "Ese plan no es superior al tuyo");
  if (client.serviceEndAt) back("/mi-plan", "error", "Tienes una baja confirmada. Escríbenos para reactivar el servicio");
  await changeTerms(client.id, { plan: p.plan, orders: p.orders, feeCents: p.feeCents, extraCents: p.extraCents }, startOfDay(), "CLIENT", by);
  await db.planRequest.updateMany({ where: { clientId: client.id, status: "PENDING", type: { in: ["DOWNGRADE", "CHANGE"] } }, data: { status: "WITHDRAWN", resolvedAt: new Date(), resolvedBy: by } });
  await db.planRequest.create({ data: { clientId: client.id, type: "UPGRADE", plan: p.plan, effectiveAt: startOfDay(), status: "APPLIED", createdBy: by, resolvedAt: new Date(), resolvedBy: by } });
  await notify({ title: `${client.name} ha subido al plan ${p.label}`, body: `Desde hoy · ${p.orders} pedidos/mes`, href: `/clientes/${client.id}`, clientId: client.id, tone: "success" });
  back("/mi-plan", "ok", `¡Hecho! Ya tienes el plan ${p.label}. Este mes se prorratea por días.`);
}

/** Bajar de plan: desde el día 1 del mes que viene. */
export async function downgradePlan(plan: string) {
  const { client, by } = await clientUser();
  const p = (await getPlans()).find((x) => x.plan === plan);
  if (!p || p.orders >= client.planOrders) back("/mi-plan", "error", "Ese plan no es inferior al tuyo");
  const effectiveAt = nextMonthStart();
  await db.planRequest.updateMany({ where: { clientId: client.id, status: "PENDING", type: { in: ["DOWNGRADE", "CHANGE"] } }, data: { status: "WITHDRAWN", resolvedAt: new Date(), resolvedBy: by } });
  await db.planRequest.create({ data: { clientId: client.id, type: "DOWNGRADE", plan: p.plan, effectiveAt, createdBy: by } });
  await notify({ title: `${client.name} bajará al plan ${p.label}`, body: `Desde el ${formatDateOnly(effectiveAt)}`, href: `/clientes/${client.id}`, clientId: client.id, tone: "warning" });
  back("/mi-plan", "ok", `Cambio programado: plan ${p.label} desde el ${formatDateOnly(effectiveAt)}.`);
}

/** Solicitar la baja: queda pendiente hasta que el equipo la confirme. */
export async function requestCancellation(form: FormData) {
  const { client, by } = await clientUser();
  const day = parseDay(str(form.get("lastDay"))) ?? monthLastDay();
  if (startOfDay(day) < startOfDay()) back("/mi-plan", "error", "La fecha de baja no puede ser anterior a hoy");
  const reason = str(form.get("reason")).slice(0, 500);
  await db.planRequest.updateMany({ where: { clientId: client.id, status: "PENDING", type: "CANCEL" }, data: { status: "WITHDRAWN", resolvedAt: new Date(), resolvedBy: by } });
  await db.planRequest.create({ data: { clientId: client.id, type: "CANCEL", effectiveAt: startOfDay(day), note: reason || null, createdBy: by } });
  await notify({ title: `${client.name} solicita la baja`, body: `Último día: ${formatDateOnly(day)}${reason ? ` · ${reason}` : ""}`, href: `/clientes/${client.id}`, clientId: client.id, tone: "danger" });
  back("/mi-plan", "ok", "Hemos recibido tu solicitud de baja. Te contactaremos para confirmarla.");
}

/** Anular una petición pendiente (el propio cliente o un administrador). */
export async function withdrawRequest(requestId: string, path: string) {
  const user = await getCurrentUser();
  const r = await db.planRequest.findUnique({ where: { id: requestId } });
  if (!user || !r || r.status !== "PENDING") back(path, "error", "Esa petición ya no está pendiente");
  if (user.role === "STAFF" || (user.role === "CLIENT" && user.clientId !== r.clientId)) back(path, "error", "No tienes permiso");
  await db.planRequest.update({ where: { id: r.id }, data: { status: "WITHDRAWN", resolvedAt: new Date(), resolvedBy: user.name || user.email } });
  if (user.role === "CLIENT") await notify({ title: "Petición anulada por el cliente", body: r.type === "CANCEL" ? "Ya no quiere darse de baja" : "Cambio de plan anulado", href: `/clientes/${r.clientId}`, clientId: r.clientId });
  back(path, "ok", "Petición anulada");
}

// ─── El administrador ───────────────────────────────────────

/** Confirma la baja pedida por el cliente (con la fecha pedida o la que se indique). */
export async function confirmCancellation(requestId: string, form: FormData) {
  const admin = await assertRole(["ADMIN"]);
  const r = await db.planRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== "PENDING" || r.type !== "CANCEL") back("/clientes", "error", "Esa solicitud ya no está pendiente");
  const day = parseDay(str(form.get("lastDay"))) ?? r.effectiveAt;
  const path = `/clientes/${r.clientId}`;
  await db.client.update({ where: { id: r.clientId }, data: { serviceEndAt: startOfDay(day) } });
  await db.planRequest.update({ where: { id: r.id }, data: { status: "APPLIED", effectiveAt: startOfDay(day), resolvedAt: new Date(), resolvedBy: admin.name || admin.email } });
  await notify({ title: "Baja confirmada", body: `Último día de servicio: ${formatDateOnly(day)}`, href: `/mi-plan?c=${r.clientId}`, clientId: r.clientId, tone: "warning", audience: "ALL" });
  back(path, "ok", `Baja confirmada. Último día: ${formatDateOnly(day)}. Puedes emitir la factura final con «Facturar hasta».`);
}

export async function rejectRequest(requestId: string) {
  const admin = await assertRole(["ADMIN"]);
  const r = await db.planRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== "PENDING") back("/clientes", "error", "Esa petición ya no está pendiente");
  await db.planRequest.update({ where: { id: r.id }, data: { status: "REJECTED", resolvedAt: new Date(), resolvedBy: admin.name || admin.email } });
  back(`/clientes/${r.clientId}`, "ok", "Petición rechazada");
}

/** Dar de baja directamente (último día de servicio) o reactivar (sin fecha). */
export async function setServiceEnd(clientId: string, form: FormData) {
  await assertRole(["ADMIN"]);
  const path = `/clientes/${clientId}`;
  if (form.get("reactivate")) {
    await db.client.update({ where: { id: clientId }, data: { serviceEndAt: null } });
    await notify({ title: "Servicio reactivado", href: `/mi-plan?c=${clientId}`, clientId, tone: "success", audience: "ALL" });
    back(path, "ok", "Servicio reactivado");
  }
  const day = parseDay(str(form.get("lastDay")));
  if (!day) back(path, "error", "Indica el último día de servicio");
  await db.client.update({ where: { id: clientId }, data: { serviceEndAt: startOfDay(day) } });
  await db.planRequest.updateMany({ where: { clientId, status: "PENDING", type: "CANCEL" }, data: { status: "APPLIED", effectiveAt: startOfDay(day), resolvedAt: new Date() } });
  back(path, "ok", `Baja registrada. Último día: ${formatDateOnly(day)}`);
}
