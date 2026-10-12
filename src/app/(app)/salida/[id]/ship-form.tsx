"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { Printer, Send } from "lucide-react";
import { labelAndShip, shipOrderAction, type FormState } from "@/app/actions";
import { CARRIERS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Method = { id: number; name: string; carrier: string };

export function ShipForm({ orderId, weightGrams, sendcloudMethods }: { orderId: string; weightGrams: number; sendcloudMethods: Method[] }) {
  const [mode, setMode] = useState<"label" | "manual">("label");
  const [labelState, labelAction] = useActionState<FormState, FormData>(labelAndShip.bind(null, orderId), undefined);
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
            <select id="method" name="method" className="input" defaultValue={lv.method || (sendcloudMethods[0] ? `sendcloud:${sendcloudMethods[0].id}` : "packia:MRW")}>
              {sendcloudMethods.length > 0 && (
                <optgroup label="Sendcloud · etiqueta oficial de la agencia">
                  {sendcloudMethods.map((m) => <option key={m.id} value={`sendcloud:${m.id}`}>{m.name}</option>)}
                </optgroup>
              )}
              <optgroup label="Etiqueta Packia (interna)">
                {CARRIERS.map((c) => <option key={c} value={`packia:${c}`}>{c} · etiqueta Packia</option>)}
              </optgroup>
            </select>
            {!sendcloudMethods.length && (
              <p className="mt-1.5 text-xs text-ink-400">Conecta Sendcloud para imprimir etiquetas oficiales de MRW, GLS, Correos Express, SEUR…</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="weight">Peso (gramos)</label>
            <input id="weight" name="weight" type="number" min={1} max={70000} defaultValue={lv.weight || weightGrams} className="input mono" />
          </div>
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
