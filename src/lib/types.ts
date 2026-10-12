export type Platform = "SHOPIFY" | "WOOCOMMERCE";

export type OrderStatus = "PENDING" | "PICKING" | "PACKED" | "SHIPPED" | "CANCELLED";

export const ORDER_FLOW: OrderStatus[] = ["PENDING", "PICKING", "PACKED", "SHIPPED"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PICKING: "Preparando",
  PACKED: "Embalado",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

export const CARRIERS = ["MRW", "GLS", "Correos Express", "SEUR", "CTT"] as const;

/** Tarifas por defecto (céntimos, sin IVA). Se pueden ajustar por cliente. */
export const PLANS = {
  ARRANQUE: { label: "Arranque", orders: 300, feeCents: 48000, extraCents: 140 },
  CRECIMIENTO: { label: "Crecimiento", orders: 600, feeCents: 85000, extraCents: 130 },
  ESCALA: { label: "Escala", orders: 1000, feeCents: 120000, extraCents: 120 },
} as const;

export const RETURN_FEE_CENTS = 150;

export type Plan = keyof typeof PLANS;

export type Address = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
  province?: string;
  country: string;
  /** Código ISO de 2 letras (ES, PT…). */
  countryCode?: string;
  phone?: string;
};

/** Pedido normalizado, venga de Shopify o de WooCommerce. */
export type ExternalOrder = {
  externalId: string;
  number: string;
  placedAt: Date;
  customerName: string;
  email?: string;
  shippingAddress: Address;
  items: { externalLineId?: string; sku: string; name: string; quantity: number }[];
  cancelled?: boolean;
};

/** Producto normalizado. */
export type ExternalProduct = {
  externalId: string;
  sku: string;
  name: string;
  imageUrl?: string;
};

export type Shipment = {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelProvider?: "PACKIA" | "SENDCLOUD" | "MANUAL";
  labelRef?: string;
  weightGrams?: number;
};

export const INBOUND_STATUS_LABEL = { EXPECTED: "Prevista", RECEIVED: "Recibida" } as const;
export const RETURN_STATUS_LABEL = { ANNOUNCED: "Anunciada", RECEIVED: "Recibida", PROCESSED: "Procesada" } as const;
