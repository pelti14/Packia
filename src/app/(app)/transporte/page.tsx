import { Calculator, Plus, Trash2, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { eur } from "@/lib/format";
import { CARRIERS } from "@/lib/types";
import { listShippingMethods, sendcloudEnabled } from "@/lib/labels";
import { WEIGHT_BANDS, ZONES, recommend, type Rates, type Strategy, type Zone } from "@/lib/shipping";
import { deleteCarrierService, loadSampleServices } from "@/app/carrier-actions";
import { Card, CardHeader, EmptyState, PageHeader, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getBrand } from "@/lib/brand";
import { ServiceForm } from "./service-form";
import { MarkupForm } from "./markup-form";

export default async function TransportePage({ searchParams }: { searchParams: Promise<{ zona?: string; kg?: string; nuevo?: string }> }) {
  await requireUser(["ADMIN"]);
  const { zona = "ES", kg = "1,5", nuevo } = await searchParams;
  const [services, settings, brand] = await Promise.all([
    db.carrierService.findMany({ orderBy: { sortOrder: "asc" } }),
    db.appSettings.findUnique({ where: { id: "default" }, select: { shippingMarkupCents: true } }),
    getBrand(),
  ]);
  const markup = settings?.shippingMarkupCents ?? 40;

  // Métodos para crear la etiqueta: internos y los de Sendcloud (si está configurado).
  const options = CARRIERS.map((c) => ({ value: `packia:${c}`, label: `${c} · etiqueta ${brand.name}`, group: "Etiqueta interna" }));
  if (await sendcloudEnabled()) {
    try {
      options.push(...(await listShippingMethods()).map((m) => ({ value: `sendcloud:${m.id}`, label: m.name, group: "Sendcloud" })));
    } catch {
      // Sendcloud no responde: se pueden seguir usando las etiquetas internas.
    }
  }
  for (const s of services) if (!options.some((o) => o.value === s.labelMethod)) options.push({ value: s.labelMethod, label: s.labelMethod, group: "Actual" });

  // Simulador
  const zone = (ZONES.some((z) => z.key === zona) ? zona : "ES") as Zone;
  const grams = Math.round((Number(kg.replace(",", ".")) || 1) * 1000);
  const sims = (["CHEAPEST", "FASTEST"] as Strategy[]).map((st) => ({ st, r: recommend(services, { zone, grams, strategy: st, markupCents: markup }) }));
  const zones = ZONES.map((z) => ({ key: z.key, label: z.label }));
  const bands = [...WEIGHT_BANDS];

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Transporte"
        description="Tus agencias con su tarifa de coste por zona y peso. Al preparar cada pedido, la app propone la más barata o la más rápida (según el cliente) y le cobra coste + margen. Aquí está tu margen."
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Calculator className="h-4 w-4 text-brand-600" /> Simulador</div>
          <form className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="zona">Destino</label>
              <select id="zona" name="zona" defaultValue={zone} className="input">{ZONES.map((z) => <option key={z.key} value={z.key}>{z.label}</option>)}</select>
            </div>
            <div>
              <label className="label" htmlFor="kg">Peso (kg)</label>
              <input id="kg" name="kg" defaultValue={kg} inputMode="decimal" className="input mono w-24" />
            </div>
            <button className="btn-ghost">Calcular</button>
          </form>
          {services.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {sims.map(({ st, r }) => (
                <div key={st} className="rounded-xl bg-white/70 p-4 ring-1 ring-line">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">{st === "CHEAPEST" ? "La más barata" : "La más rápida"}</div>
                  {r.best ? (
                    <>
                      <div className="mt-1 font-semibold text-ink-900">{r.best.service.name}</div>
                      <div className="text-sm text-ink-500">Coste {eur(r.best.costCents)} · cobras {eur(r.best.chargeCents)} · {r.best.service.transitDays} {r.best.service.transitDays === 1 ? "día" : "días"}</div>
                    </>
                  ) : <div className="mt-1 text-sm text-rose-500">{r.reason}</div>}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
        <Card className="p-5">
          <div className="mb-2 text-sm font-semibold text-ink-900">Margen general</div>
          <p className="mb-3 text-xs text-ink-500">Se suma al coste de la agencia en cada envío y va a la factura del cliente como «Transporte». Se puede personalizar por cliente en su ficha.</p>
          <MarkupForm cents={markup} />
        </Card>
      </div>

      {!services.length && (
        <Card className="mb-6">
          <EmptyState icon={Truck} title="Aún no hay servicios de transporte">
            Crea los tuyos con las tarifas de tus contratos, o carga 4 de ejemplo (GLS, Correos Express, SEUR y CTT) y ajusta los precios.
            <form action={loadSampleServices} className="mt-4"><SubmitButton>Cargar servicios de ejemplo</SubmitButton></form>
          </EmptyState>
        </Card>
      )}

      <div className="space-y-6">
        {services.map((s) => (
          <Card key={s.id}>
            <CardHeader
              title={s.name}
              subtitle={`${s.carrier} · ${s.transitDays} ${s.transitDays === 1 ? "día" : "días"} · hasta ${s.maxWeightGrams / 1000} kg`}
              action={
                <div className="flex items-center gap-2">
                  {s.active ? <Pill tone="mint">Activo</Pill> : <Pill tone="ink">Desactivado</Pill>}
                  <form action={deleteCarrierService.bind(null, s.id)}>
                    <button className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`Borrar ${s.name}`}><Trash2 className="h-4 w-4" /></button>
                  </form>
                </div>
              }
            />
            <div className="p-5">
              <ServiceForm
                initial={{ id: s.id, name: s.name, carrier: s.carrier, labelMethod: s.labelMethod, transitDays: s.transitDays, maxKg: s.maxWeightGrams / 1000, active: s.active, rates: (s.rates ?? {}) as Rates as Record<string, Record<string, number>> }}
                zones={zones}
                bands={bands}
                options={options}
              />
            </div>
          </Card>
        ))}
        {nuevo ? (
          <Card>
            <CardHeader title="Nuevo servicio" />
            <div className="p-5">
              <ServiceForm initial={{ id: null, name: "", carrier: "", labelMethod: options[0]?.value ?? "packia:GLS", transitDays: 1, maxKg: 30, active: true, rates: {} }} zones={zones} bands={bands} options={options} />
            </div>
          </Card>
        ) : (
          <a href="/transporte?nuevo=1" className="btn-ghost"><Plus className="h-4 w-4" /> Añadir servicio</a>
        )}
      </div>
    </>
  );
}
