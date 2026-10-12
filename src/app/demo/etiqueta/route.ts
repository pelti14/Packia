import { NextResponse } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { internalTrackingNumber, renderInternalLabel } from "@/lib/labels/packia";

/** Etiqueta de ejemplo para la demo (no crea envío ni toca la base de datos). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const q = new URL(req.url).searchParams;
  const pdf = await renderInternalLabel({
    orderNumber: (q.get("order") ?? "#1042").slice(0, 20),
    clientName: (q.get("client") ?? "Tienda Demo").slice(0, 40),
    carrier: (q.get("carrier") ?? "GLS").slice(0, 20),
    trackingNumber: internalTrackingNumber(),
    weightGrams: Math.min(Number(q.get("weight")) || 640, 30000),
    units: Math.min(Number(q.get("units")) || 3, 999),
    address: { name: "Laura Gómez (DEMO)", address1: "Calle Mayor 12, 3ºB", city: "Madrid", zip: "28013", province: "Madrid", country: "ES", phone: "600000000" },
  });
  return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="etiqueta-demo.pdf"', "Cache-Control": "no-store" } });
}
