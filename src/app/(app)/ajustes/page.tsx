import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pendingMigrations, systemStatus } from "@/lib/setup";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { StatusList } from "@/components/status-list";
import { MigrateForm } from "@/app/setup/forms";
import { SettingsForm } from "./settings-form";

export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  await requireUser(["ADMIN"]);
  const { bienvenida } = await searchParams;
  const [settings, checks, pending] = await Promise.all([
    db.appSettings.findUnique({ where: { id: "default" } }),
    systemStatus(),
    pendingMigrations(),
  ]);

  const initial: Record<string, string> = {};
  if (settings) {
    for (const [k, v] of Object.entries(settings)) if (typeof v === "string" && !k.startsWith("sendcloud")) initial[k] = v;
  }

  return (
    <>
      <PageHeader eyebrow="Negocio" title="Ajustes" description="Datos de la empresa, del almacén y de Sendcloud. Todo se guarda en Supabase; no hace falta tocar el hosting." />

      {bienvenida && (
        <div className="mb-6">
          <Notice tone="success">
            ¡Packia está listo! Siguientes pasos: rellena estos datos, crea tus clientes en <b>Clientes</b>, conecta sus tiendas en <b>Tiendas</b> y da acceso a tu equipo en <b>Usuarios</b>.
          </Notice>
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <SettingsForm initial={initial} sendcloudSaved={Boolean(settings?.sendcloudPublicKey && settings?.sendcloudSecretKey)} />
        </div>
        <Card>
          <CardHeader title="Estado del sistema" />
          <StatusList checks={checks} />
          {pending.length > 0 && (
            <div className="border-t border-line/70 px-5 py-4">
              <p className="mb-3 text-sm text-ink-700">Hay {pending.length} actualizaciones de la base de datos pendientes.</p>
              <MigrateForm label="Actualizar base de datos" />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
