import { syncAllStores } from "@/lib/sync";

const g = globalThis as unknown as { __packiaScheduler?: NodeJS.Timeout };

/**
 * Sincronización automática dentro del propio servidor de Next.js (Hostinger mantiene
 * el proceso en marcha). Cada SYNC_INTERVAL_SECONDS (60 por defecto) trae pedidos nuevos
 * de todas las tiendas; los productos, cada 30 minutos.
 */
export function startScheduler() {
  if (g.__packiaScheduler) return;
  const seconds = Math.max(30, Number(process.env.SYNC_INTERVAL_SECONDS) || 60);
  const run = async () => {
    if (!process.env.DATABASE_URL) return;
    try {
      const r = await syncAllStores();
      if (r.ran && (r.orders || r.errors)) console.log(`[sync] ${r.stores} tiendas · ${r.orders} pedidos nuevos · ${r.errors} errores`);
    } catch (err) {
      // Normal antes de completar /setup (sin tablas): no hacemos ruido.
      if (!/does not exist|P2021/.test(String(err))) console.error("[sync]", err);
    }
  };
  setTimeout(run, 15_000);
  g.__packiaScheduler = setInterval(run, seconds * 1000);
  console.log(`[sync] sincronización automática cada ${seconds} s`);
}
