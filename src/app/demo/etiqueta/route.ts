import { NextResponse } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { internalTrackingNumber, renderInternalLabel } from "@/lib/labels/packia";
import { getPrintSettings, layoutLabels } from "@/lib/labels/print";

const NAMES = ["Laura Gómez", "Marta Ruiz", "Jordi Puig", "Ana López", "Pablo Martín", "Lucía Fernández", "Carlos Sánchez", "Elena Navarro"];
const CITIES: [string, string][] = [["Madrid", "28013"], ["Valencia", "46001"], ["Barcelona", "08001"], ["Sevilla", "41001"], ["Bilbao", "48001"], ["Zaragoza", "50001"], ["Málaga", "29001"], ["Alicante", "03001"]];

/**
 * Etiquetas de ejemplo para la demo (no crean envíos ni tocan la base de datos).
 * ?order=#1042&carrier=GLS  → una
 * ?orders=#1041,#1042&carriers=GLS,MRW → varias seguidas, con el formato de la impresora configurada.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const q = new URL(req.url).searchParams;
  const client = (q.get("client") ?? "Tienda Demo").slice(0, 40);
  const orders = (q.get("orders") ?? q.get("order") ?? "#1042").split(",").map((s) => s.slice(0, 20)).slice(0, 50);
  const carriers = (q.get("carriers") ?? q.get("carrier") ?? "GLS").split(",").map((s) => s.slice(0, 20));

  const labels = await Promise.all(
    orders.map((order, i) => {
      const [city, zip] = CITIES[i % CITIES.length];
      return renderInternalLabel({
        orderNumber: order,
        clientName: client,
        carrier: carriers[i] ?? carriers[0] ?? "GLS",
        trackingNumber: internalTrackingNumber(),
        weightGrams: Math.min(Number(q.get("weight")) || 640, 30000),
        units: Math.min(Number(q.get("units")) || 2, 999),
        address: { name: `${NAMES[i % NAMES.length]} (DEMO)`, address1: "Calle Mayor 12, 3ºB", city, zip, country: "ES", phone: "600000000" },
      });
    }),
  );
  const pdf = await layoutLabels(labels, await getPrintSettings());
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="etiquetas-demo-${orders.length}.pdf"`, "Cache-Control": "no-store" },
  });
}
