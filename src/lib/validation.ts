import { db } from "@/lib/db";

export type Blocker = { sku: string; name: string; productId: string | null; reason: "missing" | "unvalidated" };

/**
 * Productos de un pedido que impiden embalarlo: los que no existen en el inventario
 * y los que aún no tienen el OK del equipo. Evita errores de picking con referencias nuevas.
 */
export async function orderBlockers(order: { clientId: string; items: { sku: string; name: string }[] }): Promise<Blocker[]> {
  const skus = [...new Set(order.items.map((i) => i.sku))];
  const products = await db.product.findMany({ where: { clientId: order.clientId, sku: { in: skus } }, select: { id: true, sku: true, name: true, validatedAt: true } });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const blockers: Blocker[] = [];
  for (const sku of skus) {
    const p = bySku.get(sku);
    const name = order.items.find((i) => i.sku === sku)!.name;
    if (!p) blockers.push({ sku, name, productId: null, reason: "missing" });
    else if (!p.validatedAt) blockers.push({ sku, name: p.name, productId: p.id, reason: "unvalidated" });
  }
  return blockers;
}

export function blockerMessage(blockers: Blocker[]) {
  const list = blockers.map((b) => b.sku).join(", ");
  return blockers.some((b) => b.reason === "missing")
    ? `No se puede embalar: hay productos que no están en el inventario (${list}). Créalos con una recepción y valídalos.`
    : `No se puede embalar: faltan por validar ${list}. Dales el OK en Inventario.`;
}
