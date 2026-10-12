import { cache } from "react";
import { db } from "@/lib/db";

import { DEFAULT_BRAND, type Brand } from "@/lib/brand-types";

export { DEFAULT_BRAND, type Brand };

/**
 * Marca comercial (Ajustes → Marca). Si aún no está guardada o la base de datos
 * no está lista, se usa «Packia».
 */
export const getBrand = cache(async (): Promise<Brand> => {
  const s = await db.appSettings
    .findUnique({ where: { id: "default" }, select: { brandName: true, brandTagline: true, brandLogo: true } })
    .catch(() => null);
  const name = s?.brandName?.trim() || DEFAULT_BRAND.name;
  return {
    name,
    tagline: s?.brandTagline?.trim() || DEFAULT_BRAND.tagline,
    // El logo viaja como URL ligera; la imagen la sirve /api/public/marca/logo.
    logo: s?.brandLogo ? `/api/public/marca/logo?v=${hash(s.brandLogo)}` : null,
    custom: name !== DEFAULT_BRAND.name || Boolean(s?.brandLogo),
  };
});

/** Imagen del logo guardada (data URL → bytes). */
export async function brandLogoImage() {
  const s = await db.appSettings.findUnique({ where: { id: "default" }, select: { brandLogo: true } }).catch(() => null);
  const m = s?.brandLogo?.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/);
  return m ? { type: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

/** Huella corta para que el navegador recargue el logo al cambiarlo. */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + s.length.toString(36);
}
