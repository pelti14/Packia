import { NextResponse, after } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { notify } from "@/lib/notifications";
import { registerShopifyWebhooks, syncStore } from "@/lib/sync";
import { consumeOAuthState, exchangeShopifyCode, normalizeShop, saveShopifyStore, verifyShopifyQuery } from "@/lib/onboarding";

/** Vuelta de Shopify tras aprobar la app: firma, estado anti-CSRF, token y alta de la tienda. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;
  const done = (key: "ok" | "error", msg: string) => NextResponse.redirect(new URL(`/bienvenida?${key}=${encodeURIComponent(msg)}`, url.origin));
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !verifyShopifyQuery(p, secret)) return done("error", "La respuesta de Shopify no es válida. Vuelve a intentarlo.");
  const shop = normalizeShop(p.get("shop") ?? "");
  const state = await consumeOAuthState(p.get("state"), "SHOPIFY");
  if (!shop || !state || state.domain !== shop) return done("error", "El enlace ha caducado o no es de esta tienda. Vuelve a pulsar «Conectar».");
  try {
    const token = await exchangeShopifyCode(shop, p.get("code") ?? "");
    const store = await saveShopifyStore(state.clientId, shop, token);
    const appUrl = await getAppUrl();
    // Webhooks y catálogo, después de responder (pueden tardar).
    after(async () => {
      await registerShopifyWebhooks(store.id, appUrl).catch((e) => console.error("[shopify] webhooks", e));
      await syncStore(store.id, { products: true }).catch((e) => console.error("[shopify] sync", e));
      await notify({ title: `Tienda conectada: ${shop}`, body: "Conexión en un clic (Shopify)", href: `/tiendas/${store.id}`, clientId: state.clientId, tone: "success" });
    });
    return done("ok", "¡Tienda Shopify conectada! Estamos importando tu catálogo y tus pedidos.");
  } catch (err) {
    return done("error", err instanceof Error ? err.message : "No se pudo conectar la tienda");
  }
}
