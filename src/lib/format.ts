import type { Address } from "@/lib/types";
import { TIME_ZONE } from "@/lib/schedule";

export { startOfDay, startOfMonth } from "@/lib/schedule";

const dateFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dateOnlyFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, weekday: "short", day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, month: "long", year: "numeric" });
const relFmt = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const eurFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateOnly = (d: Date) => dateOnlyFmt.format(d);
export const formatDay = (d: Date) => dayFmt.format(d);
export const formatMonth = (d: Date) => {
  const s = monthFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const eur = (cents: number) => eurFmt.format(cents / 100);

export function timeAgo(d: Date) {
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (Math.abs(mins) < 60) return relFmt.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return relFmt.format(hours, "hour");
  return relFmt.format(Math.round(hours / 24), "day");
}

export function parseAddress(json: string): Address {
  try {
    return JSON.parse(json) as Address;
  } catch {
    return { name: "", address1: "", city: "", zip: "", country: "" };
  }
}

export function units(items: { quantity: number }[]) {
  const n = items.reduce((s, i) => s + i.quantity, 0);
  return `${n} ${n === 1 ? "ud." : "uds."}`;
}
