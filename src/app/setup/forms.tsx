"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Database, ShieldCheck } from "lucide-react";
import { createFirstAdmin, runMigrations } from "./actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function MigrateForm({ label = "Crear tablas en Supabase" }: { label?: string }) {
  const [state, action] = useActionState<FormState, FormData>(() => runMigrations(), undefined);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton><Database className="h-4 w-4" /> {label}</SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
    </form>
  );
}

export function AdminForm() {
  const [state, action] = useActionState<FormState, FormData>(createFirstAdmin, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="name">Tu nombre</label>
        <input id="name" name="name" defaultValue={v.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={v.email} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" minLength={8} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" minLength={8} className="input" required />
      </div>
      {state?.error && <div className="sm:col-span-2"><Notice tone="error">{state.error}</Notice></div>}
      <div className="sm:col-span-2">
        <SubmitButton><ShieldCheck className="h-4 w-4" /> Crear administrador y entrar</SubmitButton>
      </div>
    </form>
  );
}

export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-white/90 py-1.5 pl-3.5 pr-1.5">
      <code className="mono min-w-0 flex-1 truncate text-ink-700">{value}</code>
      <button
        type="button"
        className="rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Copiar"
      >
        {copied ? <Check className="h-4 w-4 text-mint-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
