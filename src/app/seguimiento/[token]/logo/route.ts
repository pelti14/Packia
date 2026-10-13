import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validTrackingToken } from "@/lib/tracking";

export const dynamic = "force-dynamic";

/** Logo de la tienda para su página de seguimiento y sus emails (público con el token del pedido). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validTrackingToken(token)) return new NextResponse("No encontrado", { status: 404 });
  const o = await db.order.findUnique({ where: { trackingToken: token }, select: { client: { select: { publicLogo: true } } } });
  const m = o?.client.publicLogo?.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/);
  if (!m) return new NextResponse("Sin logo", { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
