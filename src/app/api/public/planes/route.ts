import { NextResponse } from "next/server";
import { getPlans } from "@/lib/plans";
import { getBrand } from "@/lib/brand";
import { getSettings } from "@/lib/settings";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Cache-Control": "public, max-age=300" };

/** Marca y precios públicos de los planes (los lee la web de GoHighLevel). Sin datos de clientes. */
export async function GET() {
  const [plans, brand, settings] = await Promise.all([getPlans(), getBrand(), getSettings()]);
  const origin = await getAppUrl();
  return NextResponse.json(
    {
      brand: { name: brand.name, tagline: brand.tagline, logo: brand.logo ? `${origin}${brand.logo}` : null },
      contact: { whatsapp: brand.whatsapp, phone: brand.phone, email: brand.email },
      // Datos fiscales para el pie legal de la web (solo los que estén rellenos en Ajustes).
      legal: settings.company.taxId ? { name: settings.company.name, taxId: settings.company.taxId, address: settings.company.address } : null,
      currency: "EUR",
      taxIncluded: false,
      plans: plans.map((p) => ({ key: p.plan, label: p.label, orders: p.orders, fee: p.feeCents / 100, extra: p.extraCents / 100 })),
    },
    { headers: CORS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
