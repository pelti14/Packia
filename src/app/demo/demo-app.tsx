"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  BadgeCheck, Boxes, Eye, FileDown, LayoutDashboard, PackageCheck, PackagePlus, Plus, Receipt, RotateCcw, RotateCw, ScanBarcode, Truck, TriangleAlert, Users,
  type LucideIcon,
} from "lucide-react";
import { PickList, type PickItem } from "@/components/pick-list";
import { Pill, StatusBadge, PlatformBadge } from "@/components/ui";
import { RETURN_FEE_CENTS, type OrderStatus } from "@/lib/types";
import type { PlanOption } from "@/lib/plans";

/* ───────────── Datos ficticios ───────────── */

type Product = { id: string; sku: string; name: string; location: string; stock: number; barcode: string; validated: boolean };
type Line = { id: string; sku: string; quantity: number };
type Order = { id: string; number: string; customer: string; city: string; platform: "SHOPIFY" | "WOOCOMMERCE"; status: OrderStatus; items: Line[]; minutesAgo: number; carrier: string; tracking?: string };
type Inbound = { id: string; ref: string; status: "EXPECTED" | "RECEIVED"; items: { sku: string; quantity: number }[] };
type Ret = { id: string; order: string; reason: string; status: "OPEN" | "RESTOCKED"; items: { sku: string; quantity: number }[] };
type State = { products: Product[]; orders: Order[]; inbounds: Inbound[]; returns: Ret[]; nextNumber: number; log: string[] };

const CLIENT = "Lumen Cosmetics";
const STORAGE = "packia:demo:state";

const initial = (): State => ({
  products: [
    { id: "p1", sku: "LUM-CRE-50", name: "Crema hidratante 50 ml", location: "A-01-01", stock: 84, barcode: "8437000000011", validated: true },
    { id: "p2", sku: "LUM-LIM-200", name: "Gel limpiador 200 ml", location: "A-01-02", stock: 52, barcode: "8437000000028", validated: true },
    { id: "p3", sku: "LUM-CON-15", name: "Contorno de ojos 15 ml", location: "A-02-01", stock: 9, barcode: "8437000000035", validated: true },
    { id: "p4", sku: "LUM-TON-150", name: "Tónico facial 150 ml", location: "A-02-03", stock: 37, barcode: "8437000000042", validated: true },
    { id: "p5", sku: "LUM-NEC-01", name: "Neceser de algodón", location: "B-01-01", stock: 120, barcode: "8437000000059", validated: true },
    { id: "p6", sku: "LUM-SER-30", name: "Sérum vitamina C 30 ml", location: "", stock: 60, barcode: "", validated: false },
  ],
  orders: [
    { id: "o1", number: "#1041", customer: "Laura Gómez", city: "Madrid", platform: "SHOPIFY", status: "PENDING", minutesAgo: 35, carrier: "GLS", items: [{ id: "l1", sku: "LUM-CRE-50", quantity: 1 }, { id: "l2", sku: "LUM-LIM-200", quantity: 2 }] },
    { id: "o2", number: "#1042", customer: "Marta Ruiz", city: "Valencia", platform: "SHOPIFY", status: "PENDING", minutesAgo: 22, carrier: "GLS", items: [{ id: "l3", sku: "LUM-SER-30", quantity: 1 }, { id: "l4", sku: "LUM-CRE-50", quantity: 1 }] },
    { id: "o3", number: "#1043", customer: "Jordi Puig", city: "Barcelona", platform: "WOOCOMMERCE", status: "PENDING", minutesAgo: 9, carrier: "MRW", items: [{ id: "l5", sku: "LUM-TON-150", quantity: 1 }, { id: "l6", sku: "LUM-NEC-01", quantity: 1 }] },
    { id: "o4", number: "#1039", customer: "Ana López", city: "Sevilla", platform: "SHOPIFY", status: "SHIPPED", minutesAgo: 1440, carrier: "GLS", tracking: "PK261011A1B2C3", items: [{ id: "l7", sku: "LUM-CON-15", quantity: 1 }] },
    { id: "o5", number: "#1040", customer: "Pablo Martín", city: "Bilbao", platform: "SHOPIFY", status: "SHIPPED", minutesAgo: 1300, carrier: "GLS", tracking: "PK261011D4E5F6", items: [{ id: "l8", sku: "LUM-CRE-50", quantity: 2 }] },
  ],
  inbounds: [
    { id: "i1", ref: "REC-0008", status: "EXPECTED", items: [{ sku: "LUM-CON-15", quantity: 40 }, { sku: "LUM-NEC-01", quantity: 50 }] },
    { id: "i3", ref: "REC-0007", status: "RECEIVED", items: [{ sku: "LUM-SER-30", quantity: 60 }] },
    { id: "i2", ref: "REC-0006", status: "RECEIVED", items: [{ sku: "LUM-CRE-50", quantity: 100 }] },
  ],
  returns: [{ id: "r1", order: "#1031", reason: "Talla/tono equivocado", status: "OPEN", items: [{ sku: "LUM-TON-150", quantity: 1 }] }],
  nextNumber: 1044,
  log: ["Tienda Shopify conectada · pedidos sincronizados cada minuto"],
});

const CUSTOMERS = [["Lucía Fernández", "Zaragoza"], ["Carlos Sánchez", "Málaga"], ["Elena Navarro", "Alicante"], ["Sergio Torres", "Valladolid"], ["Nuria Vidal", "Girona"]];

type View = "panel" | "salida" | "preparar" | "inventario" | "recepcion" | "devoluciones" | "facturacion";
type Viewer = "equipo" | "cliente";

/* ───────────── App ───────────── */

export function DemoApp({ plans }: { plans: PlanOption[] }) {
  const [s, setS] = useState<State>(initial);
  const [view, setView] = useState<View>("panel");
  const [viewer, setViewer] = useState<Viewer>("equipo");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE);
      if (saved) setS(JSON.parse(saved) as State);
    } catch {
      // sin almacenamiento: se empieza de cero
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(s));
    } catch {
      // sin almacenamiento
    }
  }, [s]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const bySku = useMemo(() => new Map(s.products.map((p) => [p.sku, p])), [s.products]);
  const blockersOf = (o: Order) => o.items.map((i) => bySku.get(i.sku)).filter((p): p is Product => !p || !p.validated);
  const open = s.orders.filter((o) => ["PENDING", "PICKING", "PACKED"].includes(o.status));
  const unvalidated = s.products.filter((p) => !p.validated);
  const staff = viewer === "equipo";

  const update = (fn: (s: State) => State, msg?: string) => {
    setS((prev) => {
      const next = fn(prev);
      return msg ? { ...next, log: [msg, ...next.log].slice(0, 8) } : next;
    });
    if (msg) setToast(msg);
  };

  const go = (v: View) => {
    setView(v);
    setValidating(null);
    window.scrollTo({ top: 0 });
  };

  const simulateOrder = () => {
    const [customer, city] = CUSTOMERS[s.nextNumber % CUSTOMERS.length];
    const pool = s.products.filter((p) => p.stock > 0);
    const a = pool[s.nextNumber % pool.length];
    const b = pool[(s.nextNumber + 2) % pool.length];
    const items = [{ id: `l${s.nextNumber}a`, sku: a.sku, quantity: 1 }, ...(a.sku !== b.sku ? [{ id: `l${s.nextNumber}b`, sku: b.sku, quantity: 2 }] : [])];
    update(
      (p) => ({ ...p, nextNumber: p.nextNumber + 1, orders: [{ id: `o${p.nextNumber}`, number: `#${p.nextNumber}`, customer, city, platform: "SHOPIFY", status: "PENDING", minutesAgo: 0, carrier: "GLS", items }, ...p.orders] }),
      `Nuevo pedido #${s.nextNumber} de Shopify (${customer})`,
    );
  };

  const reset = () => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("packia:demo:")) localStorage.removeItem(k);
      sessionStorage.removeItem(STORAGE);
    } catch {
      // sin almacenamiento
    }
    setS(initial());
    setOrderId(null);
    go("panel");
    setToast("Demo reiniciada");
  };

  const nav: { key: View; label: string; icon: LucideIcon; count?: number; red?: boolean }[] = [
    { key: "panel", label: "Panel", icon: LayoutDashboard },
    { key: "salida", label: "Salida", icon: Truck, count: open.length },
    { key: "inventario", label: "Inventario", icon: Boxes, count: staff ? unvalidated.length : undefined, red: open.some((o) => blockersOf(o).length) },
    { key: "recepcion", label: "Recepción", icon: PackagePlus, count: s.inbounds.filter((i) => i.status === "EXPECTED").length },
    { key: "devoluciones", label: "Devoluciones", icon: RotateCcw, count: s.returns.filter((r) => r.status === "OPEN").length },
    { key: "facturacion", label: "Facturación", icon: Receipt },
  ];

  const order = s.orders.find((o) => o.id === orderId) ?? null;

  return (
    <div className="space-y-6">
      {/* Barra de control de la demo */}
      <div className="glass flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1 rounded-xl bg-line/40 p-1 text-sm">
          {(["equipo", "cliente"] as Viewer[]).map((v) => (
            <button key={v} onClick={() => { setViewer(v); if (v === "cliente" && view === "preparar") go("salida"); }} className={clsx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition", viewer === v ? "bg-white text-brand-700 shadow-sm" : "text-ink-500")}>
              {v === "equipo" ? <Users className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {v === "equipo" ? "Lo que ve el almacén" : `Lo que ve el cliente (${CLIENT})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={simulateOrder} className="btn-primary"><Plus className="h-4 w-4" /> Simular pedido nuevo</button>
          <button onClick={reset} className="btn-ghost"><RotateCw className="h-4 w-4" /> Reiniciar demo</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="glass flex gap-1 overflow-x-auto p-2 lg:flex-col">
          {nav.map((n) => (
            <button key={n.key} onClick={() => go(n.key)} className={clsx("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition", view === n.key || (view === "preparar" && n.key === "salida") ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-white")}>
              <n.icon className="h-4 w-4" />
              {n.label}
              {!!n.count && <span className={clsx("ml-auto rounded-full px-1.5 text-[11px] font-bold text-white", n.red ? "bg-rose-500" : "bg-mint-500")}>{n.count}</span>}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {view === "panel" && <Panel s={s} staff={staff} open={open} unvalidated={unvalidated} go={go} />}

          {view === "salida" && (
            <Section title="Salida" sub={staff ? "Pedidos que entran de las tiendas. Se preparan, se embalan y se les pone la etiqueta." : "Tus pedidos en tiempo real: cuándo se preparan, cuándo salen y su seguimiento."}>
              <div className="glass divide-y divide-line/60">
                {s.orders.map((o) => {
                  const blockers = blockersOf(o);
                  const isOpen = ["PENDING", "PICKING", "PACKED"].includes(o.status);
                  return (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">{o.number}</span>
                          <PlatformBadge platform={o.platform} />
                          {staff && isOpen && blockers.length > 0 && <Pill tone="amber">Producto por validar</Pill>}
                        </div>
                        <div className="text-sm text-ink-500">{o.customer} · {o.city} · {o.items.reduce((a, i) => a + i.quantity, 0)} uds. · {o.carrier}{o.tracking ? <> · <span className="mono">{o.tracking}</span></> : null}</div>
                      </div>
                      <StatusBadge status={o.status} />
                      {staff && isOpen && (
                        <button onClick={() => { setOrderId(o.id); go("preparar"); }} className="btn-primary">Preparar</button>
                      )}
                      {o.status === "SHIPPED" && (
                        <a href={`/demo/etiqueta?order=${encodeURIComponent(o.number)}&client=${encodeURIComponent(CLIENT)}&carrier=${o.carrier}`} target="_blank" className="btn-ghost"><FileDown className="h-4 w-4" /> Etiqueta</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {view === "preparar" && order && (
            <Station
              key={order.id}
              order={order}
              bySku={bySku}
              blockers={blockersOf(order)}
              onValidate={(id) => { setValidating(id); setView("inventario"); }}
              onPack={() => update((p) => ({ ...p, orders: p.orders.map((o) => (o.id === order.id ? { ...o, status: "PACKED" } : o)) }), `${order.number} embalado`)}
              onUnpack={() => update((p) => ({ ...p, orders: p.orders.map((o) => (o.id === order.id ? { ...o, status: "PENDING" } : o)) }), `${order.number} vuelve a pendiente`)}
              onShip={() => {
                const tracking = `PK${Date.now().toString(36).toUpperCase().slice(-8)}`;
                update(
                  (p) => ({
                    ...p,
                    orders: p.orders.map((o) => (o.id === order.id ? { ...o, status: "SHIPPED", tracking } : o)),
                    products: p.products.map((pr) => {
                      const line = order.items.find((i) => i.sku === pr.sku);
                      return line ? { ...pr, stock: Math.max(0, pr.stock - line.quantity) } : pr;
                    }),
                  }),
                  `${order.number} enviado con ${order.carrier} · el cliente ya ve el seguimiento`,
                );
                const next = s.orders.find((o) => o.id !== order.id && ["PENDING", "PICKING"].includes(o.status));
                if (next) setOrderId(next.id);
                else go("salida");
              }}
              onBack={() => go("salida")}
            />
          )}

          {view === "inventario" && (
            <Inventory
              s={s}
              staff={staff}
              validating={validating}
              setValidating={setValidating}
              onValidate={(id, data) => {
                update((p) => ({ ...p, products: p.products.map((pr) => (pr.id === id ? { ...pr, ...data, validated: true } : pr)) }), `Producto validado: ${data.name}. Ya se puede preparar.`);
                setValidating(null);
                if (orderId) setView("preparar");
              }}
            />
          )}

          {view === "recepcion" && (
            <Section title="Recepción" sub={staff ? "Mercancía que nos manda el cliente. Al recibirla, el stock sube solo." : "Avísanos de lo que nos mandas y verás cuándo entra en el almacén."}>
              <div className="space-y-3">
                {s.inbounds.map((i) => (
                  <div key={i.id} className="glass flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="flex-1">
                      <div className="font-semibold text-ink-900">{i.ref}</div>
                      <div className="text-sm text-ink-500">{i.items.map((it) => `${it.quantity} × ${bySku.get(it.sku)?.name ?? it.sku}`).join(" · ")}</div>
                    </div>
                    {i.status === "RECEIVED" ? <Pill tone="mint">Recibida</Pill> : <Pill tone="amber">En camino</Pill>}
                    {staff && i.status === "EXPECTED" && (
                      <button
                        className="btn-primary"
                        onClick={() =>
                          update(
                            (p) => ({
                              ...p,
                              inbounds: p.inbounds.map((x) => (x.id === i.id ? { ...x, status: "RECEIVED" } : x)),
                              products: p.products.map((pr) => {
                                const it = i.items.find((x) => x.sku === pr.sku);
                                return it ? { ...pr, stock: pr.stock + it.quantity } : pr;
                              }),
                            }),
                            `${i.ref} recibida · stock actualizado`,
                          )
                        }
                      >
                        <PackageCheck className="h-4 w-4" /> Recibir
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {staff && s.products.some((p) => !p.validated) && (
                <p className="mt-3 text-sm text-ink-500">Los productos nuevos que llegan siguen <b>por validar</b> hasta que alguien del equipo les da el OK en Inventario.</p>
              )}
            </Section>
          )}

          {view === "devoluciones" && (
            <Section title="Devoluciones" sub="Se revisa el producto y, si está bien, vuelve al stock. Cada devolución se factura aparte.">
              <div className="space-y-3">
                {s.returns.map((r) => (
                  <div key={r.id} className="glass flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="flex-1">
                      <div className="font-semibold text-ink-900">Devolución del pedido {r.order}</div>
                      <div className="text-sm text-ink-500">{r.reason} · {r.items.map((it) => `${it.quantity} × ${bySku.get(it.sku)?.name ?? it.sku}`).join(", ")}</div>
                    </div>
                    {r.status === "RESTOCKED" ? <Pill tone="mint">Vuelta al stock</Pill> : <Pill tone="amber">Por revisar</Pill>}
                    {staff && r.status === "OPEN" && (
                      <button
                        className="btn-primary"
                        onClick={() =>
                          update(
                            (p) => ({
                              ...p,
                              returns: p.returns.map((x) => (x.id === r.id ? { ...x, status: "RESTOCKED" } : x)),
                              products: p.products.map((pr) => {
                                const it = r.items.find((x) => x.sku === pr.sku);
                                return it ? { ...pr, stock: pr.stock + it.quantity } : pr;
                              }),
                            }),
                            `Devolución ${r.order} revisada · vuelve al stock`,
                          )
                        }
                      >
                        Revisada · al stock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {view === "facturacion" && <Billing plans={plans} shipped={s.orders.filter((o) => o.status === "SHIPPED").length} returns={s.returns.length} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}

/* ───────────── Piezas ───────────── */

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-ink-500">{sub}</p>
      {children}
    </section>
  );
}

function Stat({ label, value, tone = "brand" }: { label: string; value: string | number; tone?: "brand" | "mint" | "amber" | "rose" }) {
  return (
    <div className="glass p-4">
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className={clsx("mt-1 font-display text-3xl font-bold", { brand: "text-ink-900", mint: "text-mint-600", amber: "text-amber-600", rose: "text-rose-500" }[tone])}>{value}</div>
    </div>
  );
}

function Panel({ s, staff, open, unvalidated, go }: { s: State; staff: boolean; open: Order[]; unvalidated: Product[]; go: (v: View) => void }) {
  const shipped = s.orders.filter((o) => o.status === "SHIPPED").length;
  const low = s.products.filter((p) => p.validated && p.stock > 0 && p.stock <= 10).length;
  return (
    <Section title={staff ? "Panel del almacén" : `Hola, ${CLIENT}`} sub={staff ? "Todo lo que hay que hacer hoy, de un vistazo." : "Así ve tu tienda cada cliente: pedidos, stock y factura, sin tener que preguntarnos."}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pedidos por preparar" value={open.length} />
        <Stat label="Enviados" value={shipped} tone="mint" />
        <Stat label="Stock bajo" value={low} tone="amber" />
        {staff ? <Stat label="Productos por validar" value={unvalidated.length} tone={unvalidated.length ? "rose" : "mint"} /> : <Stat label="Corte de envíos" value="14:00" />}
      </div>
      {staff && unvalidated.length > 0 && (
        <button onClick={() => go("inventario")} className="mt-4 flex w-full items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm text-ink-700 ring-1 ring-amber-500/30">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <span><b>{unvalidated.length} producto nuevo sin OK.</b> Hasta que alguien del equipo lo compruebe (ubicación, código de barras), los pedidos que lo llevan no se pueden embalar. Así no se envía nada equivocado.</span>
        </button>
      )}
      <div className="glass mt-6 p-5">
        <div className="mb-3 text-sm font-semibold text-ink-900">Actividad</div>
        <ul className="space-y-2 text-sm text-ink-600">
          {s.log.map((l, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{l}</li>)}
        </ul>
      </div>
    </Section>
  );
}

function Station({ order, bySku, blockers, onValidate, onPack, onUnpack, onShip, onBack }: {
  order: Order;
  bySku: Map<string, Product>;
  blockers: Product[];
  onValidate: (productId: string) => void;
  onPack: () => void;
  onUnpack: () => void;
  onShip: () => void;
  onBack: () => void;
}) {
  const items: PickItem[] = order.items.map((i) => {
    const p = bySku.get(i.sku);
    return { id: i.id, sku: i.sku, name: p?.name ?? i.sku, quantity: i.quantity, location: p?.location || null, stock: p ? p.stock : null, barcode: p?.barcode || null };
  });
  const blocked = blockers.length > 0;
  const packed = order.status === "PACKED";
  const codes = items.filter((i) => i.barcode).map((i) => i.barcode as string);
  const wrong = [...bySku.values()].find((p) => p.barcode && !order.items.some((i) => i.sku === p.sku))?.barcode;

  return (
    <Section title={`Preparar ${order.number}`} sub={`${order.customer} · ${order.city} · sale con ${order.carrier}`}>
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-brand-600 hover:underline">← Volver a Salida</button>
      {blocked && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-ink-700 ring-1 ring-amber-500/30">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-600"><TriangleAlert className="h-4 w-4" /> Este pedido no se puede embalar todavía</div>
          {blockers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span><b>{p.name}</b> <span className="mono text-ink-400">{p.sku}</span> está por validar.</span>
              <button onClick={() => onValidate(p.id)} className="btn-primary py-1.5"><BadgeCheck className="h-4 w-4" /> Validar ahora</button>
            </div>
          ))}
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="glass overflow-hidden xl:col-span-2">
          <PickList orderId={order.id} storageKey={`packia:demo:pick:${order.id}`} items={items} size="lg" />
        </div>
        <div className="space-y-4">
          <div className="glass p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold text-ink-900"><ScanBarcode className="h-4 w-4 text-brand-500" /> Prueba el escáner</div>
            <p className="text-ink-500">Escribe uno de estos códigos en «Escanea…» y pulsa Intro:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {codes.map((c) => <span key={c} className="mono rounded-lg bg-mint-50 px-2 py-1 text-xs text-mint-600">{c}</span>)}
              {wrong && <span className="mono rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-500" title="Producto que no es del pedido">{wrong}</span>}
            </div>
            <p className="mt-2 text-xs text-ink-400">El rojo es de otro producto: verás el aviso de error.</p>
          </div>
          {!packed ? (
            <button disabled={blocked} onClick={onPack} className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50">
              <PackageCheck className="h-5 w-5" /> Embalado
            </button>
          ) : (
            <>
              <button onClick={onShip} className="btn-primary w-full py-3"><Truck className="h-5 w-5" /> Crear etiqueta y enviar</button>
              <a href={`/demo/etiqueta?order=${encodeURIComponent(order.number)}&client=${encodeURIComponent(CLIENT)}&carrier=${order.carrier}&units=${order.items.reduce((a, i) => a + i.quantity, 0)}`} target="_blank" className="btn-ghost w-full"><FileDown className="h-4 w-4" /> Ver etiqueta de ejemplo (PDF)</a>
              <button onClick={onUnpack} className="w-full text-sm font-semibold text-ink-500 hover:text-ink-900">↩ Volver a pendiente</button>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function Inventory({ s, staff, validating, setValidating, onValidate }: {
  s: State;
  staff: boolean;
  validating: string | null;
  setValidating: (id: string | null) => void;
  onValidate: (id: string, data: { name: string; barcode: string; location: string }) => void;
}) {
  const p = s.products.find((x) => x.id === validating);
  const [form, setForm] = useState({ name: "", barcode: "", location: "", checked: false });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (p) setForm({ name: p.name, barcode: p.barcode, location: p.location, checked: false });
    setError(null);
  }, [p]);

  if (staff && p) {
    return (
      <Section title={`Validar · ${p.name}`} sub="Antes de preparar un producto nuevo, alguien del almacén lo comprueba en la mano. Así no hay errores de picking.">
        <form
          className="glass max-w-xl space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.barcode.trim()) return setError("Escanea o escribe el código de barras.");
            if (!form.location.trim()) return setError("Indica la ubicación en el almacén.");
            if (!form.checked) return setError("Marca la casilla de comprobación.");
            onValidate(p.id, { name: form.name, barcode: form.barcode.trim(), location: form.location.trim().toUpperCase() });
          }}
        >
          <div>
            <label className="label">Código de barras</label>
            <input autoFocus className="input mono" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Escanéalo (prueba: 8437000000066)" />
          </div>
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Ubicación</label>
            <input className="input mono" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="B-02-04" />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-brand-50/60 p-4 text-sm text-ink-700 ring-1 ring-brand-100">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-500" checked={form.checked} onChange={(e) => setForm({ ...form, checked: e.target.checked })} />
            He comprobado físicamente el producto: coincide con el nombre y el SKU, está en esa ubicación y el código es el suyo.
          </label>
          {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-500">{error}</div>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-3"><BadgeCheck className="h-5 w-5" /> Dar OK al producto</button>
            <button type="button" onClick={() => setValidating(null)} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      </Section>
    );
  }

  return (
    <Section title="Inventario" sub="El catálogo llega solo desde la tienda. El stock sube con cada recepción y devolución y baja con cada envío.">
      <div className="glass divide-y divide-line/60">
        {s.products.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <div className="mono flex h-11 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-aqua-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">{x.location || "—"}</div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink-900">{x.name}</div>
              <div className="mono text-xs text-ink-400">{x.sku}{x.barcode ? ` · ${x.barcode}` : ""}</div>
            </div>
            {!x.validated ? (
              staff ? (
                <button onClick={() => setValidating(x.id)} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-500/30 hover:bg-amber-100">Por validar · dar OK →</button>
              ) : (
                <Pill tone="amber">En revisión</Pill>
              )
            ) : x.stock <= 10 ? (
              <Pill tone={x.stock <= 0 ? "rose" : "amber"}>{x.stock <= 0 ? "Sin stock" : "Stock bajo"}</Pill>
            ) : null}
            <div className="mono w-14 text-right text-lg font-bold text-ink-900">{x.stock}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const eur = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

function Billing({ plans, shipped, returns }: { plans: PlanOption[]; shipped: number; returns: number }) {
  // Ejemplo: alta el día 6 con 2 semanas de prueba → se factura desde el 20 (12 de 31 días).
  const plan = plans[0];
  const days = 31;
  const billable = 12;
  const fee = Math.round((plan.feeCents * billable) / days);
  const included = Math.round((plan.orders * billable) / days);
  const used = 128 + shipped;
  const extra = Math.max(0, used - included);
  const lines = [
    { label: `Cuota ${plan.label} prorrateada (${billable} de ${days} días)`, cents: fee },
    { label: `Pedidos extra: ${extra} × ${eur(plan.extraCents)} (incluidos ${included})`, cents: extra * plan.extraCents },
    { label: `Devoluciones: ${returns} × ${eur(RETURN_FEE_CENTS)}`, cents: returns * RETURN_FEE_CENTS },
  ];
  const base = lines.reduce((a, l) => a + l.cents, 0);
  return (
    <Section title="Facturación" sub="Se genera sola el día 1 de cada mes. Las semanas de prueba no se cobran y el primer mes se prorratea.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pedidos este mes" value={used} />
        <Stat label="Incluidos en la cuota" value={included} tone="mint" />
        <Stat label="Estado" value="Prorrateo" tone="amber" />
      </div>
      <div className="glass mt-6 max-w-2xl p-6">
        <div className="mb-1 text-sm text-ink-500">Factura de ejemplo · {CLIENT}</div>
        <div className="mb-4 text-xs text-ink-400">Alta el día 6 · 2 semanas de prueba gratis (6–19) · se factura del 20 al 31</div>
        <div className="divide-y divide-line/60 text-sm">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-4 py-2.5"><span className="text-ink-600">{l.label}</span><span className="mono font-semibold">{eur(l.cents)}</span></div>
          ))}
          <div className="flex justify-between py-2.5"><span className="text-ink-500">IVA 21 %</span><span className="mono">{eur(Math.round(base * 0.21))}</span></div>
          <div className="flex justify-between pt-3 text-base font-bold text-ink-900"><span>Total</span><span className="mono">{eur(Math.round(base * 1.21))}</span></div>
        </div>
      </div>
    </Section>
  );
}
