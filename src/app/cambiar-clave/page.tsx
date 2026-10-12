"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export default function ChangePasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, undefined);
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <form action={action} className="glass relative w-full max-w-md space-y-5 p-8 sm:p-10">
        <Logo />
        <div>
          <h1 className="text-2xl font-bold">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-ink-500">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" className="input" required minLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Repite la contraseña</label>
          <input id="confirm" name="confirm" type="password" className="input" required minLength={8} />
        </div>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full py-3">Guardar y entrar</SubmitButton>
      </form>
    </div>
  );
}
