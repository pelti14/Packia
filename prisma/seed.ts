/**
 * Datos de demostración: 3 clientes con sus tiendas (marcadas como demo,
 * no llaman a ninguna API), catálogo, ~5 semanas de pedidos, recepciones y devoluciones.
 * Se niega a ejecutarse si hay tiendas reales conectadas.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Generador pseudoaleatorio con semilla para que la demo sea siempre igual.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const FIRST = ["Lucía", "Martín", "Sofía", "Hugo", "Paula", "Daniel", "Carmen", "Pablo", "Laura", "Javier", "Elena", "Álvaro", "Marta", "Diego", "Irene", "Adrián", "Nerea", "Sergio", "Claudia", "Raúl"];
const LAST = ["García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Ruiz", "Díaz", "Moreno", "Álvarez", "Romero", "Navarro", "Torres", "Domínguez", "Vázquez"];
const CITIES = [
  ["Madrid", "28013", "Madrid"], ["Barcelona", "08001", "Barcelona"], ["Valencia", "46002", "Valencia"],
  ["Sevilla", "41001", "Sevilla"], ["Bilbao", "48001", "Bizkaia"], ["Málaga", "29001", "Málaga"],
  ["Zaragoza", "50001", "Zaragoza"], ["A Coruña", "15001", "A Coruña"], ["Murcia", "30001", "Murcia"],
  ["Valladolid", "47001", "Valladolid"], ["Granada", "18001", "Granada"], ["Palma", "07001", "Illes Balears"],
] as const;
const STREETS = ["Calle Mayor", "Avenida de la Constitución", "Calle del Sol", "Paseo de Gracia", "Calle Real", "Avenida de América", "Calle San Fernando", "Gran Vía"];
const CARRIERS = ["MRW", "GLS", "Correos Express"];

const CLIENTS = [
  {
    name: "Lumière Cosmetics", email: "ops@lumiere.es", plan: "CRECIMIENTO", planOrders: 600, fee: 85000, extra: 130, perDay: [12, 24],
    store: { platform: "SHOPIFY", name: "lumiere.es", domain: "lumiere-cosmetics.myshopify.com", prefix: "#", start: 4120 },
    products: [
      ["LUM-SER-VC30", "Sérum Vitamina C 30 ml", "A-01-01", 64],
      ["LUM-CRM-HY50", "Crema hidratante 50 ml", "A-01-02", 41],
      ["LUM-OIL-RM30", "Aceite de rosa mosqueta 30 ml", "A-01-03", 8],
      ["LUM-MSK-CL75", "Mascarilla de arcilla 75 ml", "A-02-01", 37],
      ["LUM-EYE-CT15", "Contorno de ojos 15 ml", "A-02-02", 22],
      ["LUM-KIT-RUT", "Kit rutina facial", "A-02-03", 0],
    ],
  },
  {
    name: "Huellas & Co", email: "hola@huellasandco.com", plan: "ARRANQUE", planOrders: 300, fee: 48000, extra: 140, perDay: [8, 15],
    store: { platform: "WOOCOMMERCE", name: "huellasandco.com", domain: "https://huellasandco.com", prefix: "#", start: 2310 },
    products: [
      ["HUE-COL-NYM", "Collar de nailon — Talla M", "B-01-01", 55],
      ["HUE-ARN-L", "Arnés acolchado — Talla L", "B-01-02", 19],
      ["HUE-SNK-PO200", "Snacks naturales de pollo 200 g", "B-01-03", 120],
      ["HUE-CHA-AV250", "Champú de avena 250 ml", "B-02-01", 6],
      ["HUE-JUG-CUE", "Juguete de cuerda", "B-02-02", 74],
      ["HUE-COM-ACX", "Comedero de acero", "B-02-03", 31],
    ],
  },
  {
    name: "Nordik Supplements", email: "logistica@nordik.shop", plan: "ARRANQUE", planOrders: 300, fee: 48000, extra: 140, perDay: [5, 11],
    store: { platform: "SHOPIFY", name: "nordik.shop", domain: "nordik-supplements.myshopify.com", prefix: "#NK", start: 1088 },
    products: [
      ["NRD-COL-300", "Colágeno marino 300 g", "C-01-01", 88],
      ["NRD-MAG-120", "Magnesio bisglicinato 120 cáps.", "C-01-02", 140],
      ["NRD-OMG-90", "Omega 3 90 perlas", "C-01-03", 9],
      ["NRD-D3K2-60", "Vitamina D3 + K2 60 cáps.", "C-02-01", 63],
      ["NRD-PRO-VAN1", "Proteína vegana vainilla 1 kg", "C-02-02", 27],
    ],
  },
] as const;

async function main() {
  const real = await db.store.count({ where: { isDemo: false } });
  if (real > 0) {
    console.error("Hay tiendas reales conectadas: el seed borraría datos de producción. Abortado.");
    process.exit(1);
  }
  await db.invoice.deleteMany();
  await db.return.deleteMany();
  await db.inbound.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.store.deleteMany();
  await db.profile.deleteMany({ where: { role: "CLIENT" } });
  await db.client.deleteMany();

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const DAYS = 40;

  for (const c of CLIENTS) {
    const client = await db.client.create({
      data: {
        name: c.name, contactEmail: c.email, plan: c.plan, planOrders: c.planOrders,
        monthlyFeeCents: c.fee, extraOrderFeeCents: c.extra, returnFeeCents: 150,
        taxId: `B${int(10000000, 99999999)}`, billingAddress: `${pick(STREETS)}, ${int(1, 90)}\n${pick(CITIES)[1]} ${pick(CITIES)[0]}`,
      },
    });
    const store = await db.store.create({
      data: {
        clientId: client.id,
        platform: c.store.platform,
        name: c.store.name,
        domain: c.store.domain,
        isDemo: true,
        webhookSecret: "demo-secret",
        lastSyncAt: new Date(now.getTime() - int(2, 40) * 60_000),
      },
    });
    for (const [sku, name, location, stock] of c.products) {
      await db.product.create({ data: { clientId: client.id, storeId: store.id, sku, name, location, stock, lowStockAt: 10, weightGrams: int(80, 900) } });
    }

    let number = c.store.start;
    for (let d = DAYS - 1; d >= 0; d--) {
      const day = new Date(today);
      day.setDate(day.getDate() - d);
      const count = int(c.perDay[0], c.perDay[1]);
      for (let k = 0; k < count; k++) {
        const placedAt = new Date(day);
        placedAt.setHours(int(0, 22), int(0, 59), int(0, 59));
        if (placedAt > now) continue;

        // Antiguos: enviados. Hoy: en distintas fases de la cola.
        let status = "SHIPPED";
        let shippedAt: Date | null = null;
        if (d === 0) {
          status = pick(["PENDING", "PENDING", "PENDING", "PICKING", "PACKED", "SHIPPED"]);
        } else if (d === 1 && placedAt.getHours() >= 14) {
          status = pick(["SHIPPED", "SHIPPED", "PACKED", "PENDING"]);
        }
        if (status === "SHIPPED") {
          shippedAt = new Date(placedAt);
          if (placedAt.getHours() >= 14 || rand() < 0.04) shippedAt.setDate(shippedAt.getDate() + 1);
          shippedAt.setHours(int(15, 18), int(0, 59));
          if (shippedAt > now) {
            status = "PACKED";
            shippedAt = null;
          }
        }
        if (d > 1 && rand() < 0.015) status = "CANCELLED";

        const [city, zip, province] = pick(CITIES);
        const customer = `${pick(FIRST)} ${pick(LAST)}`;
        const lines = int(1, 3);
        const chosen = [...c.products].sort(() => rand() - 0.5).slice(0, lines);

        await db.order.create({
          data: {
            clientId: client.id,
            storeId: store.id,
            externalId: String(5_000_000 + number),
            number: `${c.store.prefix}${number++}`,
            status,
            customerName: customer,
            email: `${customer.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${int(1, 99)}@email.com`,
            shippingAddress: JSON.stringify({
              name: customer,
              address1: `${pick(STREETS)}, ${int(1, 120)}`,
              address2: rand() < 0.4 ? `${int(1, 8)}º ${pick(["A", "B", "C", "D"])}` : undefined,
              city, zip, province, country: "España",
              phone: `6${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`,
            }),
            placedAt,
            shippedAt,
            carrier: shippedAt ? pick(CARRIERS) : null,
            trackingNumber: shippedAt ? `PK${int(100000, 999999)}${int(1000, 9999)}` : null,
            labelProvider: shippedAt ? "PACKIA" : null,
            weightGrams: shippedAt ? int(250, 1800) : null,
            items: { create: chosen.map(([sku, name]) => ({ sku, name, quantity: rand() < 0.8 ? 1 : int(2, 3) })) },
          },
        });
      }
    }
  }

  // Recepciones: una prevista y una recibida por cliente.
  for (const client of await db.client.findMany({ include: { products: true } })) {
    const lines = client.products.slice(0, 3);
    const expectedAt = new Date(today);
    expectedAt.setDate(expectedAt.getDate() + int(1, 4));
    await db.inbound.create({
      data: {
        clientId: client.id, reference: `ALB-${int(1000, 9999)}`, carrier: pick(CARRIERS), boxes: int(2, 8), expectedAt,
        items: { create: lines.map((p) => ({ sku: p.sku, name: p.name, expectedQty: int(2, 12) * 10 })) },
      },
    });
    const receivedAt = new Date(today);
    receivedAt.setDate(receivedAt.getDate() - int(3, 12));
    await db.inbound.create({
      data: {
        clientId: client.id, reference: `ALB-${int(1000, 9999)}`, carrier: pick(CARRIERS), boxes: int(2, 8), status: "RECEIVED", receivedAt, expectedAt: receivedAt,
        items: { create: lines.map((p) => { const q = int(2, 12) * 10; return { sku: p.sku, name: p.name, expectedQty: q, receivedQty: q - (rand() < 0.3 ? int(1, 3) : 0), damagedQty: rand() < 0.2 ? 1 : 0 }; }) },
      },
    });

    // Devoluciones en distintos estados sobre pedidos enviados.
    const shipped = await db.order.findMany({ where: { clientId: client.id, status: "SHIPPED" }, include: { items: true }, orderBy: { shippedAt: "desc" }, take: 40 });
    for (const [i, status] of (["ANNOUNCED", "RECEIVED", "PROCESSED", "PROCESSED", "PROCESSED", "PROCESSED"] as const).entries()) {
      const order = shipped[i * 5];
      if (!order) break;
      const processedAt = status === "PROCESSED" ? new Date(order.shippedAt!.getTime() + int(4, 9) * 86_400_000) : null;
      await db.return.create({
        data: {
          clientId: client.id, orderId: order.id, status,
          reason: pick(["No le queda bien / talla", "Producto defectuoso", "No era lo que esperaba", "Desistimiento"]),
          receivedAt: status === "ANNOUNCED" ? null : processedAt ?? new Date(),
          processedAt: processedAt && processedAt < now ? processedAt : status === "PROCESSED" ? now : null,
          items: { create: order.items.slice(0, 1).map((it) => ({ sku: it.sku, name: it.name, quantity: 1, condition: status === "PROCESSED" ? (rand() < 0.8 ? "RESTOCK" : "DAMAGED") : null })) },
        },
      });
    }
  }

  const [clients, orders, products, inbounds, returns] = await Promise.all([db.client.count(), db.order.count(), db.product.count(), db.inbound.count(), db.return.count()]);
  console.log(`Demo lista: ${clients} clientes, ${products} productos, ${orders} pedidos, ${inbounds} recepciones, ${returns} devoluciones.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
