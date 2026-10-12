import { Printer, Settings2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startOfDay } from "@/lib/schedule";
import { getPrintSettings, PRINT_FORMATS } from "@/lib/labels/print";
import { Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { PrintSettingsForm } from "@/components/print-settings-form";
import { LabelQueue, type QueueRow } from "./label-queue";

const time = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const dayTime = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ tab?: string; impresora?: string }> }) {
  await requireUser(["ADMIN", "STAFF"]);
  const { tab = "pendientes", impresora } = await searchParams;
  const today = startOfDay();
  const base: Prisma.OrderWhereInput = { status: "SHIPPED", labelProvider: { in: ["PACKIA", "SENDCLOUD"] } };
  const where: Prisma.OrderWhereInput =
    tab === "impresas" ? { ...base, labelPrintedAt: { gte: today } } : tab === "hoy" ? { ...base, shippedAt: { gte: today } } : { ...base, labelPrintedAt: null };

  const [orders, pending, printedToday, shippedToday, settings] = await Promise.all([
    db.order.findMany({ where, include: { client: { select: { name: true } } }, orderBy: [{ carrier: "asc" }, { shippedAt: "asc" }], take: 500 }),
    db.order.count({ where: { ...base, labelPrintedAt: null } }),
    db.order.count({ where: { ...base, labelPrintedAt: { gte: today } } }),
    db.order.count({ where: { ...base, shippedAt: { gte: today } } }),
    getPrintSettings(),
  ]);

  const rows: QueueRow[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    client: o.client.name,
    customer: o.customerName,
    carrier: o.carrier ?? "",
    tracking: o.trackingNumber ?? "",
    shippedAt: o.shippedAt ? (o.shippedAt >= today ? time.format(o.shippedAt) : dayTime.format(o.shippedAt)) : "",
    printedAt: o.labelPrintedAt ? (o.labelPrintedAt >= today ? time.format(o.labelPrintedAt) : dayTime.format(o.labelPrintedAt)) : null,
    printCount: o.labelPrintCount,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Salida"
        title="Etiquetas"
        description="Cada etiqueta que creas al enviar un pedido llega aquí. Selecciona y se imprimen todas seguidas, ordenadas por agencia, en el formato de tu impresora."
        actions={
          <a href={impresora ? "/etiquetas" : "/etiquetas?impresora=1"} className="btn-ghost">
            <Settings2 className="h-4 w-4" /> Impresora: {PRINT_FORMATS[settings.format].label.split(" (")[0]}
          </a>
        }
      />

      {impresora && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-base font-semibold text-ink-900">Configurar impresora</h2>
          <PrintSettingsForm
            initial={{
              printFormat: settings.format,
              printOffsetX: settings.offsetX,
              printOffsetY: settings.offsetY,
              printScale: settings.scale,
              printRotate180: settings.rotate180,
              printAutoDialog: settings.autoDialog,
              printSort: settings.sort,
            }}
          />
        </Card>
      )}

      <div className="mb-4">
        <Tabs
          active={tab}
          tabs={[
            { key: "pendientes", label: "Por imprimir", href: "/etiquetas", count: pending },
            { key: "impresas", label: "Impresas hoy", href: "/etiquetas?tab=impresas", count: printedToday },
            { key: "hoy", label: "Enviados hoy", href: "/etiquetas?tab=hoy", count: shippedToday },
          ]}
        />
      </div>

      {rows.length ? (
        <LabelQueue key={tab + rows.length} rows={rows} pendingTab={tab === "pendientes"} />
      ) : (
        <Card>
          <EmptyState icon={Printer} title={tab === "pendientes" ? "No hay etiquetas por imprimir" : "Nada por aquí todavía"}>
            {tab === "pendientes" ? "Cuando crees la etiqueta de un pedido al enviarlo, aparecerá aquí para imprimirla con las demás." : "Las etiquetas de hoy aparecerán aquí."}
          </EmptyState>
        </Card>
      )}
    </>
  );
}
