import { db } from "@/lib/db";

export type Blocker = {
  sku: string;
  name: string;
  productId: string | null;
  reason: "missing" | "unvalidated" | "nostock";
  /** Para «nostock»: unidades que pide el pedido y las que hay. */
  needed?: number;
  stock?: number;
};

/**
 * Productos de un pedido que impiden embalarlo:
 * - los que no existen en el inventario,
 * - los que aún no tienen el OK del equipo (evita errores de picking con referencias nuevas),
 * - los que no tienen stock físico suficiente (el stock nunca puede quedar en negativo).
 */
export async function orderBlockers(order: { clientId: string; items: { sku: string; name: string; quantity?: number }[] }): Promise<Blocker[]> {
  const skus = [...new Set(order.items.map((i) => i.sku))];
  const products = await db.product.findMany({
    where: { clientId: order.clientId, sku: { in: skus } },
    select: { id: true, sku: true, name: true, validatedAt: true, stock: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const blockers: Blocker[] = [];
  for (const sku of skus) {
    const p = bySku.get(sku);
    const lines = order.items.filter((i) => i.sku === sku);
    const needed = lines.reduce((n, i) => n + (i.quantity ?? 0), 0);
    if (!p) blockers.push({ sku, name: lines[0].name, productId: null, reason: "missing" });
    else if (!p.validatedAt) blockers.push({ sku, name: p.name, productId: p.id, reason: "unvalidated" });
    else if (needed > 0 && p.stock < needed) blockers.push({ sku, name: p.name, productId: p.id, reason: "nostock", needed, stock: p.stock });
  }
  return blockers;
}

export function blockerMessage(blockers: Blocker[]) {
  const list = (r: Blocker["reason"]) => blockers.filter((b) => b.reason === r).map((b) => b.sku).join(", ");
  if (blockers.some((b) => b.reason === "missing")) return `No se puede embalar: hay productos que no están en el inventario (${list("missing")}). Créalos con una recepción y valídalos.`;
  if (blockers.some((b) => b.reason === "unvalidated")) return `No se puede embalar: faltan por validar ${list("unvalidated")}. Dales el OK en Inventario.`;
  const ns = blockers.filter((b) => b.reason === "nostock").map((b) => `${b.sku} (hay ${b.stock}, pide ${b.needed})`).join(", ");
  return `No se puede embalar: no hay stock suficiente de ${ns}. Registra la recepción de mercancía o corrige el inventario.`;
}
