/** Stock negativo (3.2). Necesita la base de datos de desarrollo (DATABASE_URL); si no hay, se salta. */
import { test } from "node:test";
import assert from "node:assert/strict";

const hasDb = Boolean(process.env.DATABASE_URL);

test("no se puede enviar un pedido sin stock suficiente ni dejar el stock en negativo", { skip: !hasDb && "sin DATABASE_URL" }, async () => {
  const { db } = await import("@/lib/db");
  const { shipOrder } = await import("@/lib/sync");
  const { orderBlockers } = await import("@/lib/validation");
  const tag = `TEST-${Date.now()}`;
  const client = await db.client.create({ data: { name: tag } });
  try {
    const store = await db.store.create({ data: { clientId: client.id, platform: "SHOPIFY", name: tag, domain: `${tag}.myshopify.com`, isDemo: true } });
    await db.product.create({ data: { clientId: client.id, storeId: store.id, sku: "SKU-1", name: "Camiseta L", stock: 1, validatedAt: new Date() } });
    const order = await db.order.create({
      data: {
        clientId: client.id, storeId: store.id, externalId: tag, number: "#T1", status: "PACKED", customerName: "Ana",
        shippingAddress: "{}", placedAt: new Date(), items: { create: [{ sku: "SKU-1", name: "Camiseta L", quantity: 2 }] },
      },
      include: { items: true },
    });
    const blockers = await orderBlockers(order);
    assert.equal(blockers[0]?.reason, "nostock", "el pedido queda bloqueado para embalar");
    await assert.rejects(() => shipOrder(order.id, { carrier: "GLS", trackingNumber: "X", labelProvider: "MANUAL" }), /Stock insuficiente/);
    const p = await db.product.findFirstOrThrow({ where: { clientId: client.id, sku: "SKU-1" } });
    assert.equal(p.stock, 1, "el stock no se toca");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PACKED");

    await db.product.update({ where: { id: p.id }, data: { stock: 2 } });
    await shipOrder(order.id, { carrier: "GLS", trackingNumber: "X", labelProvider: "MANUAL" });
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock, 0);
  } finally {
    await db.client.delete({ where: { id: client.id } });
    await db.$disconnect();
  }
});
