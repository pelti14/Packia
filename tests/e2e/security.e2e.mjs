/**
 * Prueba de seguridad de extremo a extremo contra una app en marcha (local o staging).
 *
 *   BASE=http://localhost:3000 CLIENT_EMAIL=… CLIENT_PASSWORD=… \
 *   FOREIGN_ORDER=… FOREIGN_INVOICE=… FOREIGN_INBOUND=… FOREIGN_RETURN=… OWN_ORDER=… \
 *   node tests/e2e/security.e2e.mjs
 *
 * FOREIGN_* son ids REALES de OTRO cliente: el usuario cliente debe recibir 404/403 en todos.
 * No la lances contra producción: los intentos fallidos de login bloquean la IP 15 minutos.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW ?? "playwright");
const env = process.env;
const B = env.BASE ?? "http://localhost:3000";
let failed = 0;
const check = (ok, msg) => { console.log(ok ? "✔" : "✘", msg); if (!ok) failed++; };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 2.3 · Cabeceras
const res = await page.request.get(`${B}/login`);
const h = res.headers();
check(!h["x-powered-by"], "sin X-Powered-By");
for (const k of ["strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy"]) check(Boolean(h[k]), `cabecera ${k}`);

// 2.4 · ?next= no saca de la app
await page.goto(`${B}/login?next=${encodeURIComponent("//evil.example")}`);
await page.fill("#email", env.CLIENT_EMAIL); await page.fill("#password", env.CLIENT_PASSWORD);
await page.getByRole("button", { name: /Entrar/ }).click();
await page.waitForLoadState("networkidle");
check(new URL(page.url()).origin === new URL(B).origin, `tras login con next=//evil.example se queda en la app (${page.url()})`);

// 2.2 · Aislamiento: ids reales de otro cliente
for (const [label, path] of [
  ["pedido", `/salida/${env.FOREIGN_ORDER}`],
  ["factura", `/facturacion/${env.FOREIGN_INVOICE}`],
  ["recepción", `/recepcion/${env.FOREIGN_INBOUND}`],
  ["devolución", `/devoluciones/${env.FOREIGN_RETURN}`],
]) {
  const r = await page.goto(`${B}${path}`);
  const text = await page.locator("body").innerText();
  check(r.status() === 404 || /no existe|no encontrad|404/i.test(text), `${label} de otro cliente → 404 (${r.status()})`);
}
const lab = await page.request.get(`${B}/api/labels/${env.FOREIGN_ORDER}`);
check([403, 404].includes(lab.status()), `etiqueta de otro cliente → ${lab.status()}`);
const own = await page.goto(`${B}/salida/${env.OWN_ORDER}`);
check(own.status() === 200, "su propio pedido sí se ve (control)");
for (const p of ["/usuarios", "/clientes", "/tiendas", "/ajustes", "/etiquetas", "/clientes-tienda", "/demo"]) {
  await page.goto(`${B}${p}`);
  check(!page.url().endsWith(p), `cliente no entra en ${p}`);
}

// 2.5 · Fuerza bruta
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
let blocked = false;
for (let i = 0; i < 7 && !blocked; i++) {
  await p2.goto(`${B}/login`);
  await p2.fill("#email", "nadie@example.com"); await p2.fill("#password", `mala-${i}`);
  await p2.getByRole("button", { name: /Entrar/ }).click();
  await p2.waitForTimeout(600);
  blocked = /Demasiados intentos/.test(await p2.locator("body").innerText());
}
check(blocked, "login bloqueado tras varios intentos fallidos");

await browser.close();
console.log(failed ? `\n${failed} comprobaciones fallidas` : "\nTodo correcto");
process.exit(failed ? 1 : 0);
