"use client";

import { useActionState, useState } from "react";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { requestPasswordReset, signIn } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  const [resetState, resetAction] = useActionState<FormState, FormData>(requestPasswordReset, undefined);

  if (mode === "reset") {
    return (
      <form action={resetAction} className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">Recuperar acceso</h2>
          <p className="mt-1 text-sm text-ink-500">Te enviamos un enlace para crear una contraseña nueva.</p>
        </div>
        <Field icon={Mail} id="reset-email" name="email" type="email" label="Email" placeholder="tu@empresa.com" />
        {resetState?.error && <Notice tone="error">{resetState.error}</Notice>}
        {resetState?.success && <Notice tone="success">{resetState.success}</Notice>}
        <SubmitButton className="w-full py-3">Enviar enlace</SubmitButton>
        <button type="button" onClick={() => setMode("login")} className="w-full text-center text-sm font-medium text-brand-600 hover:underline">
          Volver a iniciar sesión
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <h2 className="text-2xl font-bold text-ink-900">Inicia sesión</h2>
        <p className="mt-1 text-sm text-ink-500">Accede al panel de Packia.</p>
      </div>
      <Field icon={Mail} id="email" name="email" type="email" label="Email" placeholder="tu@empresa.com" defaultValue={state?.values?.email} />
      <Field icon={KeyRound} id="password" name="password" type="password" label="Contraseña" placeholder="••••••••" />
      {error === "sin-perfil" && <Notice tone="error">Tu cuenta no tiene acceso todavía. Pide a un administrador que te dé de alta.</Notice>}
      {error === "enlace" && <Notice tone="error">El enlace ha caducado o no es válido. Solicita uno nuevo.</Notice>}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full py-3">Entrar <ArrowRight className="h-4 w-4" /></SubmitButton>
      <button type="button" onClick={() => setMode("reset")} className="w-full text-center text-sm font-medium text-brand-600 hover:underline">
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}

function Field({ icon: Icon, label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Mail; label: string; id: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input id={id} className="input pl-10" required {...props} />
      </div>
    </div>
  );
}
