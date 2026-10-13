import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { RateLimiter, hardenCookie, safeRedirectPath, securityHeaders } from "@/lib/security";
import { verifyWebhook as verifyShopify } from "@/lib/integrations/shopify";
import { verifyWebhook as verifyWoo } from "@/lib/integrations/woocommerce";
import { canAccessClient, clientScope, type CurrentUser } from "@/lib/auth";

// 2.4 · Redirección abierta en ?next=
test("safeRedirectPath solo deja rutas internas", () => {
  assert.equal(safeRedirectPath("/salida?tab=TODAY"), "/salida?tab=TODAY");
  assert.equal(safeRedirectPath("/facturacion/abc#x"), "/facturacion/abc#x");
  for (const bad of ["//evil.com", "/\\evil.com", "\\\\evil.com", "https://evil.com", "http:/evil.com", "javascript:alert(1)", "evil.com", "/\tevil", "/%0d%0aSet-Cookie:x", "", null, undefined, 42]) {
    const out = safeRedirectPath(bad as string);
    assert.ok(out.startsWith("/") && !out.startsWith("//"), `no debería dejar salir: ${String(bad)} → ${out}`);
    assert.ok(!out.includes("evil.com") || out.startsWith("/%"), `fuga con ${String(bad)}`);
  }
  assert.equal(safeRedirectPath("https://evil.com", "/inventario"), "/inventario");
});

// 2.3 · Cabeceras de seguridad
test("cabeceras de seguridad completas", () => {
  const h = Object.fromEntries(securityHeaders({ supabaseUrl: "https://abc.supabase.co" }).map((x) => [x.key, x.value]));
  assert.match(h["Strict-Transport-Security"], /max-age=63072000; includeSubDomains/);
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.equal(h["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(h["Permissions-Policy"], /camera=\(\)/);
  assert.equal(h["X-Frame-Options"], "SAMEORIGIN");
  assert.match(h["Content-Security-Policy-Report-Only"], /frame-ancestors 'self'/);
  assert.match(h["Content-Security-Policy-Report-Only"], /connect-src 'self' https:\/\/abc\.supabase\.co/);
});

test("next.config desactiva X-Powered-By y aplica las cabeceras", async () => {
  const cfg = (await import("../next.config")).default;
  assert.equal(cfg.poweredByHeader, false);
  const rules = await cfg.headers!();
  assert.ok(rules.some((r) => r.source === "/:path*" && r.headers.some((x) => x.key === "Strict-Transport-Security")));
});

// 2.6 · Cookie de sesión
test("cookie de sesión endurecida", () => {
  const c = hardenCookie({ maxAge: 100, httpOnly: false }, true);
  assert.equal(c.httpOnly, true);
  assert.equal(c.secure, true);
  assert.equal(c.sameSite, "lax");
  assert.equal(c.maxAge, 100);
});

// 2.5 · Fuerza bruta
test("RateLimiter bloquea tras N fallos y libera al pasar la ventana", () => {
  const rl = new RateLimiter(5, 60_000);
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) {
    assert.equal(rl.check("a", t0).blocked, false);
    rl.fail("a", t0);
  }
  assert.equal(rl.check("a", t0 + 1000).blocked, true);
  assert.equal(rl.check("b", t0 + 1000).blocked, false, "otra clave no se ve afectada");
  assert.equal(rl.check("a", t0 + 61_000).blocked, false, "se libera al pasar la ventana");
  rl.fail("a", t0 + 62_000);
  rl.reset("a");
  assert.equal(rl.check("a", t0 + 62_001).count, 0);
});

// 2.1 · Firma de webhooks
test("webhooks: solo pasa la firma HMAC correcta del cuerpo exacto", () => {
  const secret = "s3cr3t";
  const body = JSON.stringify({ id: 1, total: "10.00" });
  const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  for (const verify of [verifyShopify, verifyWoo]) {
    assert.equal(verify(body, sig, secret), true);
    assert.equal(verify(body, null, secret), false, "sin cabecera");
    assert.equal(verify(body, "x", secret), false, "firma basura");
    assert.equal(verify(body + " ", sig, secret), false, "cuerpo alterado");
    assert.equal(verify(body, sig, "otro"), false, "secreto distinto");
    assert.equal(verify(JSON.stringify(JSON.parse(body), null, 2), sig, secret), false, "cuerpo re-serializado");
  }
});

// 2.2 · Aislamiento entre clientes (lógica)
test("un cliente solo accede a su empresa", () => {
  const client = { id: "u1", email: "a@a", name: null, role: "CLIENT", clientId: "A", clientName: "A" } satisfies CurrentUser;
  const orphan = { ...client, clientId: null } satisfies CurrentUser;
  const admin = { ...client, role: "ADMIN", clientId: null } satisfies CurrentUser;
  assert.equal(canAccessClient(client, "A"), true);
  assert.equal(canAccessClient(client, "B"), false);
  assert.deepEqual(clientScope(client), { clientId: "A" });
  assert.deepEqual(clientScope(orphan), { clientId: "__none__" }, "un cliente sin empresa no ve nada");
  assert.equal(canAccessClient(admin, "B"), true);
});
