import type { Address } from "@/lib/types";

const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });
const relFmt = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDay = (d: Date) => dayFmt.format(d);

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

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
