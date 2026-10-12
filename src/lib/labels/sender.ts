import { getSettings } from "@/lib/settings";

/** Datos del remitente (nuestro almacén) que aparecen en las etiquetas. */
export async function sender() {
  return (await getSettings()).sender;
}

const COUNTRY_CODES: Record<string, string> = {
  españa: "ES", spain: "ES", es: "ES",
  portugal: "PT", pt: "PT",
  francia: "FR", france: "FR", fr: "FR",
  italia: "IT", italy: "IT", it: "IT",
  alemania: "DE", germany: "DE", de: "DE",
  andorra: "AD", ad: "AD",
};

export function countryCode(address: { country: string; countryCode?: string }) {
  if (address.countryCode) return address.countryCode.toUpperCase();
  return COUNTRY_CODES[address.country.trim().toLowerCase()] ?? "ES";
}
