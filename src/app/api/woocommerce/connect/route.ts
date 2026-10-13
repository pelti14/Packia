import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { createOAuthState, normalizeWooUrl, wooAuthorizeUrl } from "@/lib/onboarding";

/** Empieza la conexión en un clic con WooCommerce: la tienda pide permiso y nos envía las claves. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const back = (msg: string) => NextResponse.redirect(new URL(`/bienvenida?error=${encodeURIComponent(msg)}`, url.origin));
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));
  const clientId = user.role === "CLIENT" ? user.clientId : user.role === "ADMIN" ? url.searchParams.get("client") : null;
  if (!clientId) return back("No tienes una empresa asociada");
  const storeUrl = normalizeWooUrl(url.searchParams.get("url") ?? "");
  if (!storeUrl) return back("Escribe la dirección de tu tienda, por ejemplo https://mitienda.com");
  const appUrl = await getAppUrl();
  if (!appUrl.startsWith("https://")) return back("La conexión automática de WooCommerce necesita que la app esté en https");
  const state = await createOAuthState("WOOCOMMERCE", clientId, storeUrl);
  return NextResponse.redirect(await wooAuthorizeUrl(storeUrl, state, appUrl));
}
