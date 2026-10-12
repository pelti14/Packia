export type Brand = {
  name: string;
  tagline: string;
  logo: string | null;
  custom: boolean;
  /** Contacto público: WhatsApp (solo dígitos, con prefijo), teléfono y email. */
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
};

export const DEFAULT_BRAND: Brand = { name: "Kargia", tagline: "fulfillment", logo: null, custom: false, whatsapp: null, phone: null, email: null };
