import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessClient, getCurrentUser } from "@/lib/auth";
import { labelPdf, mergePdfs } from "@/lib/labels";

export const runtime = "nodejs";

/**
 * GET /api/labels/<id>           → etiqueta de un pedido
 * GET /api/labels/batch?ids=a,b  → varias etiquetas en un PDF
 */
export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { orderId } = await params;
  const sp = new URL(req.url).searchParams;
  // Acepta ?ids=a,b y ?ids=a&ids=b (checkboxes de un formulario).
  const ids = orderId === "batch" ? sp.getAll("ids").flatMap((v) => v.split(",")).filter(Boolean) : [orderId];
  if (!ids.length || ids.length > 200) return NextResponse.json({ error: "Lista de pedidos no válida" }, { status: 400 });

  const orders = await db.order.findMany({ where: { id: { in: ids } }, include: { items: true, client: true }, orderBy: { number: "asc" } });
  const allowed = orders.filter((o) => canAccessClient(user, o.clientId) && o.labelProvider && o.labelProvider !== "MANUAL");
  if (!allowed.length) return NextResponse.json({ error: "No hay etiquetas para esos pedidos" }, { status: 404 });

  try {
    const files = await Promise.all(allowed.map(labelPdf));
    const pdf = files.length === 1 ? files[0] : await mergePdfs(files);
    const name = allowed.length === 1 ? `etiqueta-${allowed[0].number.replace(/[^\w-]/g, "")}` : `etiquetas-${allowed.length}`;
    return new NextResponse(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"` },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
