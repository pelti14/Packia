import { NextResponse } from "next/server";
import { brandLogoImage } from "@/lib/brand";

export const dynamic = "force-dynamic";

/** Logo de la marca (Ajustes → Marca). Público: lo usan la app, el favicon y la web. */
export async function GET() {
  const img = await brandLogoImage();
  if (!img) return new NextResponse("Sin logo", { status: 404 });
  return new NextResponse(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      // Un SVG subido no puede ejecutar nada.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
