import { NextResponse, after } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { notify } from "@/lib/notifications";
import { syncStore } from "@/lib/sync";
import { consumeOAuthState, saveWooStore, type WooKeys } from "@/lib/onboarding";

/**
 * WooCommerce envía aquí las claves cuando el comerciante aprueba la conexión.
 * Solo vale con un «user_id» (estado) que hayamos creado nosotros en los últimos 30 minutos.
 */
export async function POST(req: Request) {
  let keys: WooKeys;
  try {
    keys = (await req.json()) as WooKeys;
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido" }, { status: 400 });
  }
  const state = await consumeOAuthState(keys.user_id, "WOOCOMMERCE");
  if (!state) return NextResponse.json({ error: "Estado no válido o caducado" }, { status: 401 });
  try {
    const store = await saveWooStore(state, keys, await getAppUrl());
    after(async () => {
      await syncStore(store.id, { products: true }).catch((e) => console.error("[woo] sync", e));
      await notify({ title: `Tienda conectada: ${state.domain}`, body: "Conexión en un clic (WooCommerce)", href: `/tiendas/${store.id}`, clientId: state.clientId, tone: "success" });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
