import { db } from "@/lib/db";
import type { Address } from "@/lib/types";

type OrderLike = { clientId: string; storeId: string; customerName: string; email?: string | null; placedAt: Date; shippingAddress: Address };

function customerKey(o: OrderLike) {
  if (o.email) return o.email.trim().toLowerCase();
  return `${o.customerName.trim().toLowerCase()}|${o.shippingAddress.zip ?? ""}`;
}

/** Guarda o actualiza el cliente final a partir de un pedido nuevo. */
export async function recordCustomer(o: OrderLike) {
  const a = o.shippingAddress;
  const data = {
    name: o.customerName,
    email: o.email?.trim().toLowerCase() || null,
    phone: a.phone || null,
    address1: a.address1 || null,
    address2: a.address2 || null,
    city: a.city || null,
    zip: a.zip || null,
    province: a.province || null,
    country: a.countryCode || a.country || null,
  };
  const key = customerKey(o);
  const existing = await db.storeCustomer.findUnique({ where: { storeId_key: { storeId: o.storeId, key } } });
  if (existing) {
    const newer = o.placedAt > existing.lastOrderAt;
    await db.storeCustomer.update({
      where: { id: existing.id },
      data: {
        ordersCount: { increment: 1 },
        firstOrderAt: o.placedAt < existing.firstOrderAt ? o.placedAt : undefined,
        ...(newer ? { ...data, lastOrderAt: o.placedAt } : {}),
      },
    });
  } else {
    await db.storeCustomer.create({ data: { ...data, clientId: o.clientId, storeId: o.storeId, key, ordersCount: 1, firstOrderAt: o.placedAt, lastOrderAt: o.placedAt } });
  }
}

/** Reconstruye la lista de clientes finales a partir de todos los pedidos (una vez, tras actualizar). */
export async function backfillCustomers() {
  await db.storeCustomer.deleteMany();
  const pageSize = 500;
  let cursor: string | undefined;
  for (;;) {
    const orders = await db.order.findMany({
      take: pageSize,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { id: "asc" },
      select: { id: true, clientId: true, storeId: true, customerName: true, email: true, placedAt: true, shippingAddress: true },
    });
    if (!orders.length) break;
    for (const o of orders) {
      let address: Address;
      try {
        address = JSON.parse(o.shippingAddress) as Address;
      } catch {
        address = { name: o.customerName, address1: "", city: "", zip: "", country: "" };
      }
      await recordCustomer({ ...o, shippingAddress: address });
    }
    cursor = orders[orders.length - 1].id;
  }
}

const BACKFILL_FLAG = "customers-backfilled";

/**
 * La primera vez tras actualizar Packia rellena los clientes finales con todos los pedidos
 * que ya había. Se marca como hecho para no repetirlo.
 */
export async function ensureCustomersBackfilled() {
  const done = await db.syncLock.findUnique({ where: { id: BACKFILL_FLAG } });
  if (done) return false;
  // Reservamos la marca primero: si dos procesos llegan a la vez, solo uno lo hace.
  try {
    await db.syncLock.create({ data: { id: BACKFILL_FLAG, lockedUntil: new Date(0) } });
  } catch {
    return false;
  }
  try {
    await backfillCustomers();
    await db.syncLock.update({ where: { id: BACKFILL_FLAG }, data: { lastRunAt: new Date() } });
    return true;
  } catch (err) {
    await db.syncLock.delete({ where: { id: BACKFILL_FLAG } }).catch(() => {});
    throw err;
  }
}
