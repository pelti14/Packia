import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessClient, getCurrentUser, isStaff } from "@/lib/auth";
import { labelPdf } from "@/lib/labels";
import { internalTrackingNumber, renderInternalLabel } from "@/lib/labels/packia";
import { getPrintSettings, layoutLabels } from "@/lib/labels/print";

export const runtime = "nodejs";

/**
 * GET /api/labels/<id>             → etiqueta de un pedido
 * GET /api/labels/batch?ids=a,b    → varias etiquetas seguidas en un PDF
 * GET /api/labels/test?n=4         → página de prueba para calibrar la impresora
 * Se colocan según la impresora de Ajustes y se marcan como impresas (salvo ?preview=1).
 */
export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { orderId } = await params;
  const sp = new URL(req.url).searchParams;
  const settings = await getPrintSettings();

  if (orderId === "test") {
    if (!isStaff(user)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const n = Math.min(8, Math.max(1, Number(sp.get("n")) || 1));
    const sample = await renderInternalLabel({
      orderNumber: "#PRUEBA",
      clientName: "Página de prueba",
      carrier: "PRUEBA",
      trackingNumber: internalTrackingNumber(),
      weightGrams: 500,
      units: 1,
      address: { name: "Etiqueta de prueba", address1: "Comprueba que se ve entera", city: "y centrada", zip: "00000", country: "ES" },
    });
    const pdf = await layoutLabels(Array(n).fill(sample), settings, { guides: true });
    return pdfResponse(pdf, "prueba-impresora");
  }

  // Acepta ?ids=a,b y ?ids=a&ids=b (checkboxes de un formulario).
  const ids = orderId === "batch" ? sp.getAll("ids").flatMap((v) => v.split(",")).filter(Boolean) : [orderId];
  if (!ids.length || ids.length > 300) return NextResponse.json({ error: "Lista de pedidos no válida" }, { status: 400 });

  const orders = await db.order.findMany({ where: { id: { in: ids } }, include: { items: true, client: true } });
  const allowed = orders.filter((o) => canAccessClient(user, o.clientId) && o.labelProvider && o.labelProvider !== "MANUAL");
  if (!allowed.length) return NextResponse.json({ error: "No hay etiquetas para esos pedidos" }, { status: 404 });

  // Orden de impresión: por agencia (para entregar cada montón a su repartidor), por cliente o por hora.
  const time = (d: Date | null) => d?.getTime() ?? 0;
  allowed.sort((a, b) =>
    settings.sort === "TIME"
      ? time(a.shippedAt) - time(b.shippedAt)
      : settings.sort === "CLIENT"
        ? a.client.name.localeCompare(b.client.name) || a.number.localeCompare(b.number, "es", { numeric: true })
        : (a.carrier ?? "").localeCompare(b.carrier ?? "") || a.client.name.localeCompare(b.client.name) || a.number.localeCompare(b.number, "es", { numeric: true }),
  );

  try {
    const files = await Promise.all(allowed.map(labelPdf));
    const pdf = await layoutLabels(files, { ...settings, autoDialog: settings.autoDialog && sp.get("preview") !== "1" });
    if (sp.get("preview") !== "1" && isStaff(user)) {
      await db.order.updateMany({ where: { id: { in: allowed.map((o) => o.id) } }, data: { labelPrintedAt: new Date(), labelPrintCount: { increment: 1 } } });
    }
    const name = allowed.length === 1 ? `etiqueta-${allowed[0].number.replace(/[^\w-]/g, "")}` : `etiquetas-${allowed.length}`;
    return pdfResponse(pdf, name);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

function pdfResponse(pdf: Uint8Array, name: string) {
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"`, "Cache-Control": "no-store" },
  });
}
