import { NextResponse } from "next/server";
import { getPlans } from "@/lib/plans";
import { getBrand } from "@/lib/brand";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Cache-Control": "public, max-age=300" };

/** Marca y precios públicos de los planes (los lee la web de GoHighLevel). Sin datos de clientes. */
export async function GET() {
  const [plans, brand] = await Promise.all([getPlans(), getBrand()]);
  const origin = await getAppUrl();
  return NextResponse.json(
    {
      brand: { name: brand.name, tagline: brand.tagline, logo: brand.logo ? `${origin}${brand.logo}` : null },
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
