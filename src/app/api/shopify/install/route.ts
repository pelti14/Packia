import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { createOAuthState, normalizeShop, shopifyAuthorizeUrl, shopifyOAuthConfigured } from "@/lib/onboarding";

/** Empieza la conexión en un clic con Shopify (el cliente, o un admin para un cliente). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const back = (msg: string) => NextResponse.redirect(new URL(`/bienvenida?error=${encodeURIComponent(msg)}`, url.origin));
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));
  const clientId = user.role === "CLIENT" ? user.clientId : user.role === "ADMIN" ? url.searchParams.get("client") : null;
  if (!clientId) return back("No tienes una empresa asociada");
  if (!shopifyOAuthConfigured()) return back("La conexión automática con Shopify aún no está activada. Escríbenos y la conectamos nosotros.");
  const shop = normalizeShop(url.searchParams.get("shop") ?? "");
  if (!shop) return back("Escribe el nombre de tu tienda de Shopify, por ejemplo mitienda.myshopify.com");
  const state = await createOAuthState("SHOPIFY", clientId, shop);
  return NextResponse.redirect(shopifyAuthorizeUrl(shop, state, await getAppUrl()));
}
