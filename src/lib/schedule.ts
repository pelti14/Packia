/**
 * Calendario operativo del almacén en hora de Madrid (el servidor puede estar en UTC).
 * Un pedido recibido antes de la hora de corte en día laborable sale ese día;
 * si no, el siguiente día laborable.
 */
export const TIME_ZONE = "Europe/Madrid";
export const CUTOFF_HOUR = 14;
/** 1 = lunes … 5 = viernes. */
export const SHIPPING_WEEKDAYS = [1, 2, 3, 4, 5];

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

/** Fecha local de Madrid como "AAAA-MM-DD". */
export function dayKey(d: Date): string {
  const p = parts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Instante UTC de las 00:00 en Madrid del día indicado. */
export function madridMidnight(y: number, m: number, d: number): Date {
  let guess = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess));
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    guess -= asUtc - Date.UTC(y, m - 1, d);
  }
  return new Date(guess);
}

export function startOfDay(d = new Date()) {
  const p = parts(d);
  return madridMidnight(p.y, p.m, p.d);
}

export function addDays(d: Date, n: number) {
  const p = parts(d);
  return madridMidnight(p.y, p.m, p.d + n);
}

export function startOfMonth(d = new Date()) {
  const p = parts(d);
  return madridMidnight(p.y, p.m, 1);
}

/** Primer y último instante (exclusivo) del mes "AAAA-MM". */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: madridMidnight(y, m, 1), end: madridMidnight(y, m + 1, 1) };
}

export function monthKey(d = new Date()) {
  return dayKey(d).slice(0, 7);
}

export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weekday(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

function nextKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Día (AAAA-MM-DD) en que el pedido debe salir. */
export function dueKey(placedAt: Date): string {
  let key = dayKey(placedAt);
  const late = parts(placedAt).h >= CUTOFF_HOUR;
  if (!SHIPPING_WEEKDAYS.includes(weekday(key)) || late) {
    do key = nextKey(key);
    while (!SHIPPING_WEEKDAYS.includes(weekday(key)));
  }
  return key;
}

export type Urgency = "OVERDUE" | "TODAY" | "LATER";

export function urgency(placedAt: Date, now = new Date()): Urgency {
  const due = dueKey(placedAt);
  const today = dayKey(now);
  return due < today ? "OVERDUE" : due === today ? "TODAY" : "LATER";
}

/** El envío cumplió el plazo si salió como tarde el día que tocaba. */
export function shippedOnTime(placedAt: Date, shippedAt: Date) {
  return dayKey(shippedAt) <= dueKey(placedAt);
}
