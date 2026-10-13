"use client";

import { useActionState } from "react";
import { saveShippingMarkup } from "@/app/carrier-actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function MarkupForm({ cents }: { cents: number }) {
  const [state, action] = useActionState<FormState, FormData>(saveShippingMarkup, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="markup">Margen por envío (€)</label>
        <input id="markup" name="markup" inputMode="decimal" defaultValue={(cents / 100).toFixed(2).replace(".", ",")} className="input mono w-32" />
      </div>
      <SubmitButton variant="ghost">Guardar margen</SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
    </form>
  );
}
