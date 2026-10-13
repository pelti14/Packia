"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { Printer, Send } from "lucide-react";
import { labelAndShip, shipOrderAction, type FormState } from "@/app/actions";
import { CARRIERS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { printLabel } from "@/components/print-toast";
import { ShippingAdviceBox } from "@/components/shipping-advice";
import type { ShippingAdvice } from "@/lib/shipping";

type Option = { value: string; label: string; group: string };

export function ShipForm({ orderId, weightGrams, options, defaultValue, printOnPack, advice }: { orderId: string; weightGrams: number; options: Option[]; defaultValue: string; printOnPack: boolean; advice: ShippingAdvice | null }) {
  const [mode, setMode] = useState<"label" | "manual">("label");
  const [labelState, labelAction] = useActionState<FormState, FormData>(async (prev, form) => {
    const r = await labelAndShip(orderId, prev, form);
    if ((r?.success || r?.error?.startsWith("Etiqueta creada")) && form.get("printNow") === "on") printLabel(`/api/labels/${orderId}`, "Etiqueta del pedido");
    return r;
  }, undefined);
  const [manualState, manualAction] = useActionState<FormState, FormData>(shipOrderAction.bind(null, orderId), undefined);
  const lv = labelState?.values ?? {};
  const mv = manualState?.values ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/50 p-1 text-sm font-medium">
        {(["label", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={clsx("rounded-lg px-3 py-1.5 transition", mode === m ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-900")}
          >
            {m === "label" ? "Crear etiqueta" : "Ya tengo seguimiento"}
          </button>
        ))}
      </div>

      {mode === "label" ? (
        <form action={labelAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="method">Envío</label>
            {advice && <div className="mb-2"><ShippingAdviceBox advice={advice} /></div>}
            <select id="method" name="method" className="input" defaultValue={lv.method || defaultValue}>
              {[...new Set(options.map((o) => o.group))].map((g) => (
                <optgroup key={g} label={g}>
                  {options.filter((o) => o.group === g).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}{o.value === defaultValue ? " ★ por defecto" : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {!options.some((o) => o.value.startsWith("sendcloud:")) && (
              <p className="mt-1.5 text-xs text-ink-400">Conecta Sendcloud (en Ajustes o en la ficha del cliente) para imprimir etiquetas oficiales de GLS, MRW, SEUR…</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="weight">Peso (gramos)</label>
            <input id="weight" name="weight" type="number" min={1} max={70000} defaultValue={lv.weight || weightGrams} className="input mono" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
            <input type="checkbox" name="printNow" defaultChecked={printOnPack} className="h-5 w-5 accent-brand-500" />
            Imprimir la etiqueta al terminar
          </label>
          {labelState?.error && <Notice tone="error">{labelState.error}</Notice>}
          <SubmitButton className="w-full"><Printer className="h-4 w-4" /> Crear etiqueta y enviar</SubmitButton>
        </form>
      ) : (
        <form action={manualAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="carrier">Agencia</label>
            <select id="carrier" name="carrier" className="input" defaultValue={mv.carrier || "MRW"}>
              {CARRIERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="trackingNumber">Número de seguimiento</label>
            <input id="trackingNumber" name="trackingNumber" defaultValue={mv.trackingNumber} className="input mono" placeholder="Escanea o escribe el código" />
          </div>
          {manualState?.error && <Notice tone="error">{manualState.error}</Notice>}
          <SubmitButton className="w-full"><Send className="h-4 w-4" /> Marcar como enviado</SubmitButton>
        </form>
      )}
    </div>
  );
}
