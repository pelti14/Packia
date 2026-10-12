/**
 * Genera supabase/setup.sql a partir de prisma/migrations, para pegarlo en
 * Supabase → SQL Editor si no se quiere usar el asistente /setup.
 * Registra cada migración en _prisma_migrations (mismo checksum que Prisma),
 * así después `prisma migrate deploy` y el asistente siguen funcionando.
 *   npm run setup:sql
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "prisma", "migrations");
const names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

let out = `-- Packia · creación de tablas para Supabase (base de datos NUEVA).
-- Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Generado con \`npm run setup:sql\`. No lo edites a mano.

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
`;

for (const name of names) {
  const sql = fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  out += `\n-- ════════ ${name} ════════\n${sql.trim()}\n\nINSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)\nVALUES ('${crypto.randomUUID()}', '${checksum}', now(), '${name}', 1);\n`;
}

fs.mkdirSync("supabase", { recursive: true });
fs.writeFileSync(path.join("supabase", "setup.sql"), out);
console.log(`supabase/setup.sql generado (${names.length} migraciones)`);
