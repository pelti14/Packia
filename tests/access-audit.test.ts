/**
 * Auditoría estática de control de acceso. Falla si alguien añade una página, una ruta de API
 * o una acción de servidor sin comprobar quién llama. Así no depende de acordarse.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..", "src");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const files = walk(root);
const rel = (f: string) => path.relative(root, f);

// Rutas públicas a propósito (con su propia protección).
const PUBLIC_ROUTES = [
  "app/api/webhooks/shopify/route.ts", // firma HMAC
  "app/api/webhooks/woocommerce/route.ts", // firma HMAC
  "app/api/cron/sync/route.ts", // CRON_SECRET
  "app/api/public/planes/route.ts", // solo marca y precios
  "app/api/public/marca/logo/route.ts", // solo el logo
  "app/auth/callback/route.ts", // canje del código de Supabase
  "app/auth/signout/route.ts",
];
const AUTH = /requireUser\(|getCurrentUser\(|assertRole\(|clientUser\(/;

test("las páginas de detalle de la app comprueban el cliente o restringen el rol", () => {
  const pages = files.filter((f) => /app\/\(app\)\/.*\[[^\]]+\].*\/page\.tsx$/.test(f));
  assert.ok(pages.length >= 5);
  for (const f of pages) {
    const src = fs.readFileSync(f, "utf8");
    assert.match(src, AUTH, `${rel(f)} no comprueba sesión`);
    const restrictsRole = /requireUser\(\[(?![^\]]*"CLIENT")[^\]]*\]\)/.test(src);
    assert.ok(restrictsRole || src.includes("canAccessClient("), `${rel(f)} abre un recurso por id sin comprobar a qué cliente pertenece`);
  }
});

test("las rutas de API comprueban sesión salvo las públicas declaradas", () => {
  for (const f of files.filter((x) => x.endsWith("route.ts") && x.includes(`${path.sep}app${path.sep}`))) {
    if (PUBLIC_ROUTES.includes(rel(f).split(path.sep).join("/"))) continue;
    if (rel(f).startsWith(path.join("app", "setup"))) continue; // el asistente tiene su propia protección
    assert.match(fs.readFileSync(f, "utf8"), AUTH, `${rel(f)} no comprueba sesión`);
  }
});

test("cada acción de servidor exportada comprueba quién la llama", () => {
  const SELF_SERVICE = new Set(["signIn", "signOut", "requestPasswordReset", "updatePassword"]); // login y contraseña
  let checked = 0;
  for (const f of files.filter((x) => fs.readFileSync(x, "utf8").startsWith('"use server"'))) {
    const src = fs.readFileSync(f, "utf8");
    const re = /export async function (\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const [, name, body] = m;
      if (SELF_SERVICE.has(name) || rel(f).includes(`app${path.sep}setup`)) continue;
      assert.match(body.slice(0, 600), AUTH, `${rel(f)} → ${name}() no comprueba el rol al empezar`);
      checked++;
    }
  }
  assert.ok(checked >= 40, `solo se han revisado ${checked} acciones: ¿ha cambiado el formato del código?`);
});

test("los webhooks verifican la firma antes de leer el pedido", () => {
  for (const f of ["app/api/webhooks/shopify/route.ts", "app/api/webhooks/woocommerce/route.ts"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    assert.match(src, /await req\.text\(\)/, `${f}: debe usar el cuerpo sin procesar`);
    const verifyAt = src.indexOf("verifyWebhook(");
    const parseAt = src.indexOf("JSON.parse(");
    assert.ok(verifyAt > 0 && parseAt > verifyAt, `${f}: la firma se debe comprobar antes de procesar el JSON`);
    assert.match(src, /status: 401/);
  }
});
