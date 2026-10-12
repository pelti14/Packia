import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Configuración inicial desde la app: comprobaciones y creación de tablas.
 * Las tablas se crean con las mismas migraciones que `prisma migrate deploy`
 * y se registran en _prisma_migrations, así ambos métodos son compatibles.
 */

export type Check = { key: string; label: string; ok: boolean; detail?: string };

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

const REQUIRED_ENV = [
  ["NEXT_PUBLIC_SUPABASE_URL", "URL del proyecto de Supabase"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Clave anon (pública) de Supabase"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Clave service_role de Supabase"],
  ["DATABASE_URL", "Conexión a la base de datos"],
  ["DIRECT_URL", "Conexión directa a la base de datos"],
  ["ENCRYPTION_KEY", "Clave de cifrado"],
] as const;

export function missingEnv() {
  return REQUIRED_ENV.filter(([k]) => !process.env[k]).map(([k, label]) => ({ key: k, label }));
}

function encryptionKeyOk() {
  const raw = process.env.ENCRYPTION_KEY;
  return Boolean(raw && Buffer.from(raw, "base64").length === 32);
}

async function listMigrations() {
  const dirs = (await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  return Promise.all(
    dirs.map(async (name) => {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
      return { name, sql, checksum: crypto.createHash("sha256").update(sql).digest("hex") };
    }),
  );
}

async function appliedMigrations(): Promise<Set<string>> {
  const exists = await db.$queryRaw<{ t: string | null }[]>`SELECT to_regclass('public._prisma_migrations')::text AS t`;
  if (!exists[0]?.t) return new Set();
  const rows = await db.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  return new Set(rows.map((r) => r.migration_name));
}

export async function pendingMigrations() {
  const [all, applied] = await Promise.all([listMigrations(), appliedMigrations()]);
  return all.filter((m) => !applied.has(m.name));
}

/** Separa un migration.sql en sentencias (Prisma genera SQL simple, sin funciones con ";"). */
function statements(sql: string) {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Aplica las migraciones pendientes en orden, cada una en su transacción. */
export async function applyMigrations(): Promise<string[]> {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`);
  const applied: string[] = [];
  for (const m of await pendingMigrations()) {
    await db.$transaction(async (tx) => {
      for (const stmt of statements(m.sql)) await tx.$executeRawUnsafe(stmt);
      await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
        VALUES (${crypto.randomUUID()}, ${m.checksum}, now(), ${m.name}, 1)`;
    });
    applied.push(m.name);
  }
  return applied;
}

export async function adminExists() {
  return (await db.profile.count({ where: { role: "ADMIN" } })) > 0;
}

/**
 * true si la app aún no está instalada (faltan variables, tablas o administrador).
 * Las actualizaciones de base de datos de una app ya instalada no cuentan: las aplica
 * el administrador desde la pantalla de actualización, después de iniciar sesión.
 */
export async function needsSetup() {
  try {
    if (missingEnv().length) return true;
    return !(await adminExists());
  } catch {
    return true;
  }
}

/** Estado de cada pieza, para el asistente y para Ajustes. */
export async function systemStatus(): Promise<Check[]> {
  const checks: Check[] = [];
  const missing = missingEnv();
  checks.push({
    key: "env",
    label: "Variables de entorno",
    ok: missing.length === 0,
    detail: missing.length ? `Faltan: ${missing.map((m) => m.key).join(", ")}` : "Todas configuradas",
  });
  checks.push({
    key: "encryption",
    label: "Clave de cifrado",
    ok: encryptionKeyOk(),
    detail: encryptionKeyOk() ? "Válida (32 bytes)" : "ENCRYPTION_KEY debe ser de 32 bytes en base64",
  });

  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
    checks.push({ key: "db", label: "Base de datos (Supabase Postgres)", ok: true, detail: "Conectada" });
  } catch (err) {
    checks.push({ key: "db", label: "Base de datos (Supabase Postgres)", ok: false, detail: short(err) });
  }

  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.push({ key: "auth", label: "Supabase Auth", ok: !error, detail: error ? error.message : "Conectado con la clave service_role" });
  } catch (err) {
    checks.push({ key: "auth", label: "Supabase Auth", ok: false, detail: short(err) });
  }

  if (dbOk) {
    try {
      const pending = await pendingMigrations();
      checks.push({
        key: "tables",
        label: "Tablas",
        ok: pending.length === 0,
        detail: pending.length ? `${pending.length} migraciones pendientes` : "Creadas y al día (RLS activado)",
      });
      if (!pending.length) {
        const ok = await adminExists();
        checks.push({ key: "admin", label: "Administrador", ok, detail: ok ? "Creado" : "Falta crear el primer administrador" });
      }
    } catch (err) {
      checks.push({ key: "tables", label: "Tablas", ok: false, detail: short(err) });
    }
  }
  return checks;
}

function short(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 220) ?? msg;
}
