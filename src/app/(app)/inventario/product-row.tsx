"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { updateProduct, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

type Props = {
  product: { id: string; sku: string; name: string; imageUrl: string | null; stock: number; location: string | null; lowStockAt: number; weightGrams: number | null };
  clientName: string;
  editable: boolean;
  validated: boolean;
};

export function ProductRow({ product: p, clientName, editable, validated }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(async (prev, form) => {
    const r = await updateProduct(p.id, prev, form);
    if (r?.success) setEditing(false);
    return r;
  }, undefined);

  const level = p.stock <= 0 ? "out" : p.stock <= p.lowStockAt ? "low" : "ok";
  const formId = `product-${p.id}`;

  return (
    <tr className="transition hover:bg-brand-50/40">
      <td className="cell">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-aqua-50 ring-1 ring-brand-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-900">{p.name}</div>
            <div className="mono text-xs text-ink-400">{p.sku}</div>
            {!validated && (
              editable ? (
                <Link href={`/inventario/validar/${p.id}`} className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-500/30 hover:bg-amber-100">
                  Por validar · dar OK →
                </Link>
              ) : (
                <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">En revisión</span>
              )
            )}
          </div>
        </div>
      </td>
      <td className="cell text-ink-700">{clientName}</td>
      <td className="cell">
        {editing ? (
          <input form={formId} name="location" defaultValue={p.location ?? ""} className="input mono w-28 py-1.5" placeholder="A-01-01" />
        ) : (
          <span className="mono rounded-lg bg-white px-2 py-1 text-ink-700 ring-1 ring-line">{p.location ?? "—"}</span>
        )}
      </td>
      <td className="cell">
        {editing ? (
          <div className="flex items-center gap-2">
            <input form={formId} name="stock" type="number" min={0} defaultValue={p.stock} className="input mono w-24 py-1.5" />
            <span className="text-xs text-ink-400">mín.</span>
            <input form={formId} name="lowStockAt" type="number" min={0} defaultValue={p.lowStockAt} className="input mono w-20 py-1.5" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "mono text-base font-semibold",
                level === "out" && "text-rose-500",
                level === "low" && "text-amber-600",
                level === "ok" && "text-ink-900",
              )}
            >
              {p.stock}
            </span>
            {level !== "ok" && (
              <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", level === "out" ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600")}>
                {level === "out" ? "Agotado" : "Bajo"}
              </span>
            )}
          </div>
        )}
        {state?.error && <div className="mt-1 text-xs text-rose-500">{state.error}</div>}
      </td>
      <td className="cell">
        {editing ? (
          <input form={formId} name="weightGrams" type="number" min={0} defaultValue={p.weightGrams ?? ""} placeholder="g" className="input mono w-24 py-1.5" />
        ) : (
          <span className="mono text-ink-500">{p.weightGrams ? `${p.weightGrams} g` : "—"}</span>
        )}
      </td>
      {editable && <td className="cell text-right">
        {editing ? (
          <form id={formId} action={action} className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setEditing(false)}>Cancelar</button>
            <SubmitButton className="px-3 py-1.5">Guardar</SubmitButton>
          </form>
        ) : (
          <button className="btn-ghost px-3 py-1.5" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        )}
      </td>}
    </tr>
  );
}
