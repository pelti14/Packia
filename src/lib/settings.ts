import { cache } from "react";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export type Settings = {
  company: { name: string; taxId: string; address: string; email: string; iban: string };
  sender: { name: string; address: string; city: string; zip: string; country: string; phone: string; email: string };
  sendcloud: { publicKey: string; secretKey: string };
};

const env = (k: string) => process.env[k] ?? "";

/**
 * Ajustes de la empresa: lo guardado en la app (Ajustes) manda;
 * si un campo está vacío se usa la variable de entorno equivalente.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const s = await db.appSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  const pick = (v: string | null | undefined, envKey: string, fallback = "") => v || env(envKey) || fallback;
  return {
    company: {
      name: pick(s?.companyName, "COMPANY_NAME", "Packia Fulfillment"),
      taxId: pick(s?.companyTaxId, "COMPANY_TAX_ID"),
      address: pick(s?.companyAddress, "COMPANY_ADDRESS"),
      email: pick(s?.companyEmail, "COMPANY_EMAIL"),
      iban: pick(s?.companyIban, "COMPANY_IBAN"),
    },
    sender: {
      name: pick(s?.senderName, "SENDER_NAME", "Packia Fulfillment"),
      address: pick(s?.senderAddress, "SENDER_ADDRESS"),
      city: pick(s?.senderCity, "SENDER_CITY"),
      zip: pick(s?.senderZip, "SENDER_ZIP"),
      country: pick(s?.senderCountry, "SENDER_COUNTRY", "ES"),
      phone: pick(s?.senderPhone, "SENDER_PHONE"),
      email: pick(s?.senderEmail, "SENDER_EMAIL"),
    },
    sendcloud: {
      publicKey: decrypt(s?.sendcloudPublicKey) || env("SENDCLOUD_PUBLIC_KEY"),
      secretKey: decrypt(s?.sendcloudSecretKey) || env("SENDCLOUD_SECRET_KEY"),
    },
  };
});
