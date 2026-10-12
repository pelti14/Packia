"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PackageCheck, Printer, Undo2 } from "lucide-react";
import { labelAndShip, packOrder, revertOrder, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { PickList } from "@/components/pick-list";

type Item = { id: string; sku: string; name: string; quantity: number; location: string | null; stock: number | null };
type Option = { value: string; label: string; group: string };

export function Station(props: {
  order: { id: string; number: string; status: string; clientName: string; customerName: string; address: string; urgent: "OVERDUE" | "TODAY" | "LATER" };
  items: Item[];
  options: Option[];
  defaultValue: string;
  weight: number;
  nextHref: string;
  prevHref: string | null;
}) {
  const { order, items, options, defaultValue, weight, nextHref, prevHref } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const packed = order.status === "PACKED";

  // Tras crear la etiqueta pasamos al siguiente pedido y dejamos el enlace para imprimirla.
  const [state, shipAction] = useActionState<FormState, FormData>(async (prev, form) => {
    const r = await labelAndShip(order.id, prev, form);
    if (r?.success || r?.error?.startsWith("Etiqueta creada")) {
      router.push(`${nextHref}${nextHref.includes("?") ? "&" : "?"}etiqueta=${order.id}`);
    }
    return r;
  }, undefined);


  const pack = () =>
    startTransition(async () => {
      await packOrder(order.id);
      router.push(nextHref);
    });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-5">
      <div className="glass overflow-hidden xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">{order.clientName}</div>
            <div className="mono mt-1 text-4xl font-bold text-ink-900">{order.number}</div>
            <div className="mt-1 text-sm text-ink-500">{order.customerName}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {order.urgent === "OVERDUE" && <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-500 ring-1 ring-rose-500/20">Retrasado</span>}
            {order.urgent === "TODAY" && <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-600 ring-1 ring-brand-500/20">Sale hoy</span>}
            {packed && <span className="rounded-full bg-aqua-50 px-3 py-1 text-sm font-semibold text-aqua-600 ring-1 ring-aqua-500/25">Ya embalado</span>}
          </div>
        </div>
        <PickList orderId={order.id} items={items} size="lg" />
        <div className="border-t border-line/70 px-6 py-4 text-sm text-ink-500">{order.address}</div>
      </div>

      <div className="space-y-4 xl:col-span-2">
        <div className="glass space-y-4 p-6">
          {!packed && (
            <button type="button" onClick={pack} disabled={pending} className="btn-primary w-full py-4 text-base">
              <PackageCheck className="h-5 w-5" /> {pending ? "Guardando…" : "Embalado · siguiente"} <ArrowRight className="h-5 w-5" />
            </button>
          )}
          {!packed && <p className="text-center text-xs text-ink-400">Toca cada producto al cogerlo para ir marcándolo.</p>}

          <form action={shipAction} className="space-y-3 rounded-2xl border border-line bg-white/60 p-4">
            <div className="text-sm font-semibold text-ink-900">{packed ? "Crear etiqueta y enviar" : "O embalar y crear la etiqueta ya"}</div>
            <select name="method" defaultValue={defaultValue} className="input" aria-label="Envío">
              {[...new Set(options.map((o) => o.group))].map((g) => (
                <optgroup key={g} label={g}>
                  {options.filter((o) => o.group === g).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}{o.value === defaultValue ? " ★" : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input name="weight" type="number" min={1} defaultValue={weight} className="input mono" aria-label="Peso en gramos" />
              <span className="text-sm text-ink-500">g</span>
            </div>
            {state?.error && <Notice tone="error">{state.error}</Notice>}
            <SubmitButton variant={packed ? "primary" : "ghost"} className="w-full">
              <Printer className="h-4 w-4" /> Etiqueta y enviar · siguiente
            </SubmitButton>
          </form>

          <div className="flex items-center justify-between gap-2 pt-1">
            {prevHref ? (
              <button type="button" onClick={() => router.push(prevHref)} className="btn-ghost px-3"><ArrowLeft className="h-4 w-4" /> Anterior</button>
            ) : <span />}
            {(packed || order.status === "PICKING") && (
              <button type="button" onClick={() => startTransition(async () => { await revertOrder(order.id); router.refresh(); })} className="btn-ghost px-3">
                <Undo2 className="h-4 w-4" /> Volver a pendiente
              </button>
            )}
            <button type="button" onClick={() => router.push(nextHref)} className="btn-ghost px-3">Saltar <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
