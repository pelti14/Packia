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

export const PLANS = {
  ARRANQUE: { label: "Arranque", orders: 300 },
  CRECIMIENTO: { label: "Crecimiento", orders: 600 },
  ESCALA: { label: "Escala", orders: 1000 },
} as const;

export type Plan = keyof typeof PLANS;

export type Address = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
  province?: string;
  country: string;
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
};
