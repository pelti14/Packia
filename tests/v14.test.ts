/** v14: transporte multi-agencia, alta autoservicio con conexión en un clic y seguimiento con marca. */
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { CarrierService } from "@prisma/client";
import { quote, recommend, zoneFor, SAMPLE_SERVICES } from "@/lib/shipping";
import { normalizeShop, normalizeWooUrl, verifyShopifyQuery } from "@/lib/onboarding";
import { buyerEmail, parseEvents, safeColor, stageOf, textOn, validTrackingToken } from "@/lib/tracking";
import { verifyWebhook as verifySendcloud } from "@/lib/labels/sendcloud";

const hasDb = Boolean(process.env.DATABASE_URL);
const services = SAMPLE_SERVICES.map((s, i) => ({ ...s, id: `s${i}`, active: true, maxWeightGrams: 30000, sortOrder: i, createdAt: new Date(), updatedAt: new Date() })) as unknown as CarrierService[];

test("zonas por código postal y país", () => {
  assert.equal(zoneFor({ country: "España", countryCode: "ES", zip: "28001" }), "ES");
  assert.equal(zoneFor({ country: "España", countryCode: "ES", zip: "07001" }), "BAL");
  assert.equal(zoneFor({ country: "España", countryCode: "ES", zip: "38001" }), "CAN");
  assert.equal(zoneFor({ country: "España", countryCode: "ES", zip: "51001" }), "CYM");
  assert.equal(zoneFor({ country: "Portugal", countryCode: "PT", zip: "1000-001" }), "PT");
  assert.equal(zoneFor({ country: "France", countryCode: "FR", zip: "75001" }), "EU");
  assert.equal(zoneFor({ country: "USA", countryCode: "US", zip: "10001" }), "INT");
});

test("la tarifa elige el tramo de peso correcto y respeta el peso máximo", () => {
  const s = { rates: { ES: { 1000: 400, 2000: 450, 5000: 600 } }, maxWeightGrams: 5000 };
  assert.equal(quote(s, "ES", 800), 400);
  assert.equal(quote(s, "ES", 1000), 400);
  assert.equal(quote(s, "ES", 1001), 450);
  assert.equal(quote(s, "ES", 5001), null);
  assert.equal(quote(s, "CAN", 500), null);
});

test("recomienda la más barata, la más rápida o la de por defecto, con el margen", () => {
  const cheap = recommend(services, { zone: "ES", grams: 900, strategy: "CHEAPEST", markupCents: 40 });
  assert.equal(cheap.best?.costCents, 340);
  assert.equal(cheap.best?.chargeCents, 380);
  const fast = recommend(services, { zone: "ES", grams: 900, strategy: "FASTEST", markupCents: 0 });
  assert.equal(fast.best?.service.transitDays, Math.min(...services.map((s) => s.transitDays)));
  const def = recommend(services, { zone: "ES", grams: 900, strategy: "DEFAULT", markupCents: 0, defaultMethod: services[0].labelMethod });
  assert.equal(def.best?.service.id, services[0].id);
  const canarias = recommend(services, { zone: "CAN", grams: 900, strategy: "CHEAPEST", markupCents: 0 });
  assert.equal(canarias.quotes.length, 1, "solo una agencia cubre Canarias");
  assert.equal(recommend(services, { zone: "INT", grams: 900, strategy: "CHEAPEST", markupCents: 0 }).best, null);
});

test("Shopify: la firma de la vuelta se comprueba (y una alterada se rechaza)", () => {
  const secret = "shpss_test";
  const p = new URLSearchParams({ code: "abc", shop: "tienda.myshopify.com", state: "x".repeat(32), timestamp: "1700000000", host: "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvdGllbmRh" });
  const msg = new URLSearchParams([...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1))).toString();
  p.set("hmac", crypto.createHmac("sha256", secret).update(msg).digest("hex"));
  assert.ok(verifyShopifyQuery(p, secret));
  const tampered = new URLSearchParams(p);
  tampered.set("shop", "otra.myshopify.com");
  assert.equal(verifyShopifyQuery(tampered, secret), false);
  assert.equal(verifyShopifyQuery(p, "otro_secreto"), false);
  const noHmac = new URLSearchParams(p);
  noHmac.delete("hmac");
  assert.equal(verifyShopifyQuery(noHmac, secret), false);
});

test("se normalizan las direcciones de tienda y se rechazan las raras", () => {
  assert.equal(normalizeShop("mitienda"), "mitienda.myshopify.com");
  assert.equal(normalizeShop("https://MiTienda.myshopify.com/admin"), "mitienda.myshopify.com");
  assert.equal(normalizeShop("https://admin.shopify.com/store/mitienda/orders"), "mitienda.myshopify.com");
  assert.equal(normalizeShop("evil.com"), null);
  assert.equal(normalizeShop("x.myshopify.com.evil.com"), null);
  assert.equal(normalizeWooUrl("mitienda.com/"), "https://mitienda.com");
  assert.equal(normalizeWooUrl("https://mitienda.com/tienda/"), "https://mitienda.com/tienda");
  assert.equal(normalizeWooUrl("localhost"), null);
  assert.equal(normalizeWooUrl("javascript:alert(1)"), null);
});

test("Sendcloud: solo se aceptan avisos firmados", () => {
  const body = JSON.stringify({ action: "parcel_status_changed", parcel: { id: 1, status: { id: 11 } } });
  const sig = crypto.createHmac("sha256", "secreto").update(body).digest("hex");
  assert.ok(verifySendcloud(body, sig, "secreto"));
  assert.equal(verifySendcloud(body, sig, "otro"), false);
  assert.equal(verifySendcloud(body, null, "secreto"), false);
  assert.equal(verifySendcloud(body, sig, ""), false);
});

test("seguimiento: etapas, colores y emails sin inyección de HTML", () => {
  assert.equal(stageOf({ status: "PENDING" }), 0);
  assert.equal(stageOf({ status: "PACKED" }), 1);
  assert.equal(stageOf({ status: "SHIPPED" }), 2);
  assert.equal(stageOf({ status: "SHIPPED", deliveredAt: new Date() }), 3);
  assert.deepEqual([...parseEvents("SHIPPED, nada ,DELIVERED")], ["SHIPPED", "DELIVERED"]);
  assert.equal(safeColor("red; background:url(x)"), "#0B0B0D");
  assert.equal(textOn("#C3FC1D"), "#0B0B0D");
  assert.equal(textOn("#0B0B0D"), "#FFFFFF");
  assert.ok(validTrackingToken("a".repeat(24)));
  assert.equal(validTrackingToken("../../etc"), false);
  const mail = buyerEmail("SHIPPED", { brandName: "<b>Tienda</b>", color: "#112233", orderNumber: "#1", firstName: "<script>", items: [{ name: "Taza <img onerror=x>", quantity: 1 }], carrier: "GLS", trackingNumber: "123", pageUrl: "https://app/seguimiento/x" });
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<img onerror"), "el HTML del comprador se escapa");
  assert.match(mail.subject, /va de camino/);
  assert.match(mail.html, /seguimiento\/x/);
});

test("OAuth: el estado vale una sola vez y para su tipo", { skip: !hasDb && "sin DATABASE_URL" }, async () => {
  const { db } = await import("@/lib/db");
  const { createOAuthState, consumeOAuthState } = await import("@/lib/onboarding");
  const client = await db.client.create({ data: { name: `TEST-OAUTH-${Date.now()}` } });
  try {
    const s = await createOAuthState("WOOCOMMERCE", client.id, "https://tienda.com");
    assert.equal(await consumeOAuthState(s, "SHOPIFY"), null, "otro tipo no vale");
    assert.equal((await consumeOAuthState(s, "WOOCOMMERCE"))?.clientId, client.id);
    assert.equal(await consumeOAuthState(s, "WOOCOMMERCE"), null, "segunda vez no vale");
    const old = await createOAuthState("SHOPIFY", client.id, "x.myshopify.com");
    await db.oAuthState.update({ where: { id: old }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    assert.equal(await consumeOAuthState(old, "SHOPIFY"), null, "caducado");
  } finally {
    await db.oAuthState.deleteMany({ where: { clientId: client.id } });
    await db.client.delete({ where: { id: client.id } });
  }
});

test("avisos al comprador: solo si están activados y una vez por evento", { skip: !hasDb && "sin DATABASE_URL" }, async () => {
  const { db } = await import("@/lib/db");
  const { notifyBuyer } = await import("@/lib/tracking");
  const tag = `TEST-MAIL-${Date.now()}`;
  const client = await db.client.create({ data: { name: tag } });
  try {
    const store = await db.store.create({ data: { clientId: client.id, platform: "SHOPIFY", name: tag, domain: `${tag}.myshopify.com`, isDemo: true } });
    const order = await db.order.create({ data: { clientId: client.id, storeId: store.id, externalId: tag, number: "#M1", customerName: "Ana López", email: "ana@example.com", shippingAddress: "{}", placedAt: new Date(), items: { create: [{ sku: "A", name: "Taza", quantity: 1 }] } } });
    assert.equal(await notifyBuyer(order.id, "SHIPPED"), "off", "desactivado por defecto");
    await db.client.update({ where: { id: client.id }, data: { trackingEnabled: true, notifyBuyer: "KARGIA", buyerEvents: "SHIPPED" } });
    assert.equal(await notifyBuyer(order.id, "PACKED"), "off", "evento no elegido");
    const first = await notifyBuyer(order.id, "SHIPPED");
    assert.ok(first === "skipped" || first === "sent");
    assert.equal(await notifyBuyer(order.id, "SHIPPED"), "dup", "nunca dos veces");
  } finally {
    await db.client.delete({ where: { id: client.id } });
  }
});
