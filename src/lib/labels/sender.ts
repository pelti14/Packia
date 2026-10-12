/** Datos del remitente (nuestro almacén) que aparecen en las etiquetas. */
export function sender() {
  return {
    name: process.env.SENDER_NAME ?? "Packia Fulfillment",
    address: process.env.SENDER_ADDRESS ?? "",
    city: process.env.SENDER_CITY ?? "",
    zip: process.env.SENDER_ZIP ?? "",
    country: process.env.SENDER_COUNTRY ?? "ES",
    phone: process.env.SENDER_PHONE ?? "",
    email: process.env.SENDER_EMAIL ?? "",
  };
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
