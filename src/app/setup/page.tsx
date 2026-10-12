import crypto from "node:crypto";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card, CardHeader, Notice } from "@/components/ui";
import { StatusList } from "@/components/status-list";
import { adminExists, missingEnv, systemStatus } from "@/lib/setup";
import { getCurrentUser } from "@/lib/auth";
import { AdminForm, CopyValue, MigrateForm } from "./forms";

export const dynamic = "force-dynamic";

const ENV_HELP: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "Supabase → Project Settings → API → Project URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase → Project Settings → API → anon public",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase → Project Settings → API → service_role (secreta)",
  DATABASE_URL: "Supabase → Connect → Transaction pooler (puerto 6543) + ?pgbouncer=true",
  DIRECT_URL: "Supabase → Connect → Session pooler (puerto 5432)",
  ENCRYPTION_KEY: "Usa la clave generada abajo",
};

function Step({ n, title, done, active, children }: { n: number; title: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <Card className={clsx("transition", !active && !done && "opacity-50")}>
      <div className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
        <span
          className={clsx(
            "mono flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
            done ? "bg-gradient-to-br from-mint-500 to-aqua-500 text-white" : active ? "bg-gradient-to-br from-brand-500 to-aqua-500 text-white" : "bg-line/70 text-ink-500",
          )}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      </div>
      {(active || done) && <div className="px-5 py-5">{children}</div>}
    </Card>
  );
}

export default async function SetupPage() {
  // Con un administrador ya creado, el detalle técnico solo lo ve un administrador con sesión.
  const hasAdmin = await adminExists().catch(() => false);
  if (hasAdmin) {
    const user = await getCurrentUser().catch(() => null);
    if (user?.role !== "ADMIN") {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="max-w-md space-y-4 p-8">
            <Logo />
            <p className="text-sm text-ink-700">Packia ya tiene administrador. Inicia sesión como administrador para revisar la configuración.</p>
            <Link href="/login?next=/ajustes" className="btn-primary">Iniciar sesión <ArrowRight className="h-4 w-4" /></Link>
          </Card>
        </div>
      );
    }
  }
  const checks = await systemStatus();
  const ok = (k: string) => checks.find((c) => c.key === k)?.ok ?? false;
  const envOk = ok("env") && ok("encryption");
  const connOk = envOk && ok("db") && ok("auth");
  const tablesOk = connOk && ok("tables");
  const adminOk = tablesOk && ok("admin");
  const missing = missingEnv();
  const suggestedKey = crypto.randomBytes(32).toString("base64");

  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-8">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <Logo />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Configuración inicial</div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Pon Packia en marcha</h1>
          <p className="mt-2 text-sm text-ink-500">Cuatro pasos. Esta página solo está disponible hasta que exista el primer administrador.</p>
        </div>

        {adminOk ? (
          <Card className="p-6">
            <Notice tone="success">Todo listo. Packia ya está configurado.</Notice>
            <Link href="/login" className="btn-primary mt-4">Ir al login <ArrowRight className="h-4 w-4" /></Link>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader title="Estado" />
              <StatusList checks={checks} />
            </Card>

            <Step n={1} title="Variables de entorno" done={envOk} active={!envOk}>
              {missing.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-ink-700">
                    Añádelas en tu hosting (en Hostinger: <b>Node.js web app → Variables de entorno</b>) y vuelve a desplegar. Faltan:
                  </p>
                  <ul className="space-y-2">
                    {missing.map((m) => (
                      <li key={m.key} className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-line">
                        <div className="mono text-sm font-semibold text-ink-900">{m.key}</div>
                        <div className="text-xs text-ink-500">{ENV_HELP[m.key]}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!ok("encryption") && (
                <div className="mt-4 space-y-2">
                  <div className="label">ENCRYPTION_KEY generada para ti</div>
                  <CopyValue value={suggestedKey} />
                  <p className="text-xs text-ink-500">Guárdala también en un sitio seguro: sin ella no se pueden leer las claves de las tiendas.</p>
                </div>
              )}
              {envOk && <p className="text-sm text-mint-600">Variables configuradas.</p>}
            </Step>

            <Step n={2} title="Conexión con Supabase" done={connOk} active={envOk && !connOk}>
              <p className="text-sm text-ink-700">
                Revisa en el estado de arriba qué falla. Lo más habitual: contraseña de la base de datos mal copiada en <span className="mono">DATABASE_URL</span>,
                o la clave <span className="mono">service_role</span> confundida con la <span className="mono">anon</span>.
              </p>
            </Step>

            <Step n={3} title="Crear las tablas" done={tablesOk} active={connOk && !tablesOk}>
              <p className="mb-4 text-sm text-ink-700">
                Crea todas las tablas de Packia en tu base de datos de Supabase y activa la seguridad (RLS) para que nadie pueda leerlas desde fuera.
              </p>
              <MigrateForm />
              <p className="mt-3 text-xs text-ink-500">Alternativa: pega el archivo <span className="mono">supabase/setup.sql</span> en Supabase → SQL Editor → Run.</p>
            </Step>

            <Step n={4} title="Primer administrador" done={adminOk} active={tablesOk && !adminOk}>
              <AdminForm />
            </Step>
          </>
        )}
      </div>
    </div>
  );
}
