import type { CarrierService, Client } from "@prisma/client";
import { db } from "@/lib/db";
import type { Address } from "@/lib/types";

/**
 * B1 · Elección automática de agencia.
 * Cada servicio tiene una tarifa de COSTE (lo que te cobra la agencia) por zona y tramo de peso.
 * Al cliente se le cobra coste + margen. La app recomienda el servicio según la estrategia del cliente.
 */

export const ZONES = [
  { key: "ES", label: "Península" },
  { key: "BAL", label: "Baleares" },
  { key: "CAN", label: "Canarias" },
  { key: "CYM", label: "Ceuta y Melilla" },
  { key: "PT", label: "Portugal" },
  { key: "EU", label: "Resto de la UE" },
] as const;
export type Zone = (typeof ZONES)[number]["key"] | "INT";

/** Tramos de peso en gramos (límite superior de cada tramo). */
export const WEIGHT_BANDS = [1000, 2000, 5000, 10000, 15000, 20000, 30000] as const;

export type Rates = Partial<Record<Zone, Record<string, number>>>;

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "RO", "SK", "SI", "SE"]);
const COUNTRY_NAMES: Record<string, string> = { españa: "ES", spain: "ES", portugal: "PT", francia: "FR", france: "FR", italia: "IT", italy: "IT", alemania: "DE", germany: "DE" };

/** Zona de envío a partir de la dirección (país y código postal). */
export function zoneFor(address: Pick<Address, "country" | "countryCode" | "zip">): Zone {
  const code = (address.countryCode || COUNTRY_NAMES[address.country?.trim().toLowerCase() ?? ""] || address.country || "").toUpperCase();
  const zip = (address.zip ?? "").replace(/\s/g, "");
  if (code === "ES" || code === "") {
    if (/^07/.test(zip)) return "BAL";
    if (/^(35|38)/.test(zip)) return "CAN";
    if (/^(51|52)/.test(zip)) return "CYM";
    return "ES";
  }
  if (code === "PT") return "PT";
  if (EU.has(code)) return "EU";
  return "INT";
}

/** Coste de un servicio para una zona y un peso, o null si no lo cubre. */
export function quote(service: Pick<CarrierService, "rates" | "maxWeightGrams">, zone: Zone, grams: number): number | null {
  if (grams > service.maxWeightGrams) return null;
  const table = (service.rates as Rates | null)?.[zone];
  if (!table) return null;
  const band = Object.keys(table).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b).find((limit) => grams <= limit);
  if (band === undefined) return null;
  const cents = table[String(band)];
  return typeof cents === "number" && cents >= 0 ? cents : null;
}

export type Strategy = "DEFAULT" | "CHEAPEST" | "FASTEST";
export type Quote = { service: CarrierService; costCents: number; chargeCents: number };
export type Recommendation = { zone: Zone; grams: number; quotes: Quote[]; best: Quote | null; reason: string };

/**
 * Opciones posibles ordenadas y la recomendada.
 * CHEAPEST: menor coste (a igualdad, la más rápida). FASTEST: menos días (a igualdad, la más barata).
 * DEFAULT: la de por defecto del cliente si tiene tarifa; si no, la más barata.
 */
export function recommend(services: CarrierService[], opts: { zone: Zone; grams: number; strategy: Strategy; markupCents: number; defaultMethod?: string | null }): Recommendation {
  const quotes = services
    .filter((s) => s.active)
    .map((s) => {
      const cost = quote(s, opts.zone, opts.grams);
      return cost === null ? null : { service: s, costCents: cost, chargeCents: cost + opts.markupCents };
    })
    .filter((q): q is Quote => q !== null);
  const cheapest = [...quotes].sort((a, b) => a.costCents - b.costCents || a.service.transitDays - b.service.transitDays);
  const fastest = [...quotes].sort((a, b) => a.service.transitDays - b.service.transitDays || a.costCents - b.costCents);
  const zoneLabel = ZONES.find((z) => z.key === opts.zone)?.label ?? "Internacional";
  if (!quotes.length) return { zone: opts.zone, grams: opts.grams, quotes, best: null, reason: `Ninguna tarifa cubre ${zoneLabel} con ${(opts.grams / 1000).toFixed(1)} kg` };
  if (opts.strategy === "FASTEST") return { zone: opts.zone, grams: opts.grams, quotes: fastest, best: fastest[0], reason: `La más rápida a ${zoneLabel}` };
  if (opts.strategy === "DEFAULT" && opts.defaultMethod) {
    const def = quotes.find((q) => q.service.labelMethod === opts.defaultMethod);
    if (def) return { zone: opts.zone, grams: opts.grams, quotes: cheapest, best: def, reason: "La agencia por defecto del cliente" };
  }
  return { zone: opts.zone, grams: opts.grams, quotes: cheapest, best: cheapest[0], reason: `La más barata a ${zoneLabel}` };
}

/** Margen por envío del cliente (o el general). */
export async function markupFor(client: Pick<Client, "shippingMarkupCents">) {
  if (client.shippingMarkupCents !== null && client.shippingMarkupCents !== undefined) return client.shippingMarkupCents;
  const s = await db.appSettings.findUnique({ where: { id: "default" }, select: { shippingMarkupCents: true } }).catch(() => null);
  return s?.shippingMarkupCents ?? 40;
}

/** Recomendación para un pedido. */
export async function recommendFor(client: Client, address: Address, grams: number) {
  const services = await db.carrierService.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }).catch(() => []);
  return recommend(services, {
    zone: zoneFor(address),
    grams,
    strategy: (client.shippingStrategy as Strategy) || "DEFAULT",
    markupCents: await markupFor(client),
    defaultMethod: client.defaultShipping,
  });
}

/** Tarifas de ejemplo para empezar (orientativas: pon las de tus contratos). */
export const SAMPLE_SERVICES: { name: string; carrier: string; labelMethod: string; transitDays: number; rates: Rates }[] = [
  {
    name: "GLS Business 24h", carrier: "GLS", labelMethod: "packia:GLS", transitDays: 1,
    rates: { ES: { 1000: 395, 2000: 420, 5000: 510, 10000: 690, 15000: 890, 20000: 1090, 30000: 1490 }, BAL: { 2000: 790, 5000: 990, 10000: 1390 }, PT: { 2000: 690, 5000: 850, 10000: 1150 } },
  },
  {
    name: "Correos Express ePaq 24", carrier: "Correos Express", labelMethod: "packia:Correos Express", transitDays: 1,
    rates: { ES: { 1000: 410, 2000: 430, 5000: 520, 10000: 720, 20000: 1150 }, BAL: { 2000: 690, 5000: 880, 10000: 1290 }, CAN: { 2000: 1290, 5000: 1790 }, CYM: { 2000: 1190, 5000: 1690 }, PT: { 2000: 720, 5000: 890 } },
  },
  {
    name: "SEUR 48h", carrier: "SEUR", labelMethod: "packia:SEUR", transitDays: 2,
    rates: { ES: { 1000: 360, 2000: 390, 5000: 480, 10000: 650, 20000: 1020, 30000: 1390 }, BAL: { 2000: 820, 5000: 1020 }, PT: { 2000: 650, 5000: 820, 10000: 1090 }, EU: { 2000: 1290, 5000: 1590, 10000: 2190 } },
  },
  {
    name: "CTT Express 48h", carrier: "CTT", labelMethod: "packia:CTT", transitDays: 2,
    rates: { ES: { 1000: 340, 2000: 370, 5000: 460, 10000: 640, 20000: 990 }, PT: { 2000: 520, 5000: 690, 10000: 920 } },
  },
];

export type ShippingAdvice = {
  /** Método que se preselecciona en el formulario de etiqueta. */
  method: string | null;
  title: string;
  detail: string;
  options: { method: string; label: string; costCents: number; chargeCents: number; days: number; best: boolean }[];
};

/** Resumen para el formulario de etiqueta: qué servicio se recomienda y por qué, con alternativas. */
export async function adviceFor(client: Client, address: Address, grams: number, available: { value: string }[]): Promise<ShippingAdvice | null> {
  const rec = await recommendFor(client, address, grams);
  const usable = rec.quotes.filter((q) => available.some((o) => o.value === q.service.labelMethod));
  if (!usable.length) return null;
  const best = rec.best && usable.includes(rec.best) ? rec.best : usable[0];
  const eur = (c: number) => (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return {
    method: best.service.labelMethod,
    title: `${best.service.name} · ${best.service.transitDays} ${best.service.transitDays === 1 ? "día" : "días"}`,
    detail: `${best === rec.best ? rec.reason : "La mejor disponible"} · coste ${eur(best.costCents)} · se cobra ${eur(best.chargeCents)} · ${(grams / 1000).toFixed(2)} kg`,
    options: usable.slice(0, 4).map((q) => ({
      method: q.service.labelMethod,
      label: q.service.name,
      costCents: q.costCents,
      chargeCents: q.chargeCents,
      days: q.service.transitDays,
      best: q === best,
    })),
  };
}
