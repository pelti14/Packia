"use client";

import { useActionState, useState } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { createInviteAction, deleteInviteAction, saveSignupSettings } from "@/app/invite-actions";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

type Invite = { id: string; token: string; email: string | null; companyName: string | null; plan: string | null; expiresAt: string; used: boolean };

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="input mono min-w-0 flex-1 text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de alta" />
      <button type="button" className="btn-ghost shrink-0" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        <Copy className="h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function InvitesCard({ appUrl, plans, invites, openSignup, defaultTrialWeeks }: {
  appUrl: string;
  plans: { plan: string; label: string }[];
  invites: Invite[];
  openSignup: boolean;
  defaultTrialWeeks: number;
}) {
  const [state, action] = useActionState<(NonNullable<FormState> & { token?: string }) | undefined, FormData>(createInviteAction, undefined);
  const [sState, sAction] = useActionState<FormState, FormData>(saveSignupSettings, undefined);
  const link = (t: string) => `${appUrl}/alta?invite=${t}`;
  return (
    <div className="space-y-5 px-5 py-5">
      <form action={action} className="space-y-3">
        <p className="text-xs text-ink-500">La tienda crea su cuenta, conecta Shopify o WooCommerce en un clic y nos avisa de su stock. Tú no tienes que copiar claves.</p>
        <input name="companyName" className="input" placeholder="Nombre de la tienda (opcional)" aria-label="Nombre de la tienda" />
        <input name="email" type="email" className="input" placeholder="Email (opcional: solo ese email podrá usarlo)" aria-label="Email" />
        <div className="grid grid-cols-2 gap-2">
          <select name="plan" className="input" aria-label="Plan" defaultValue="">
            <option value="">Plan: lo elige él</option>
            {plans.map((p) => <option key={p.plan} value={p.plan}>{p.label}</option>)}
          </select>
          <input name="trialWeeks" className="input" inputMode="numeric" defaultValue={defaultTrialWeeks} aria-label="Semanas de prueba" title="Semanas de prueba" />
        </div>
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        {state?.token && <><Notice tone="success">{state.success}</Notice><CopyLink url={link(state.token)} /></>}
        <SubmitButton><Link2 className="h-4 w-4" /> Crear enlace de alta</SubmitButton>
      </form>

      {invites.length > 0 && (
        <ul className="space-y-2 border-t border-line/70 pt-4">
          {invites.map((i) => (
            <li key={i.id} className="rounded-xl bg-white/60 p-3 text-xs ring-1 ring-line">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span><b className="text-ink-900">{i.companyName || i.email || "Sin nombre"}</b>{i.plan ? ` · ${plans.find((p) => p.plan === i.plan)?.label ?? i.plan}` : ""}</span>
                {i.used ? <span className="font-semibold text-mint-600">Usada</span> : (
                  <button type="button" onClick={() => deleteInviteAction(i.id)} className="text-ink-400 hover:text-rose-500" aria-label="Borrar invitación"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              {!i.used && <CopyLink url={link(i.token)} />}
              {!i.used && <div className="mt-1 text-ink-400">Caduca el {new Date(i.expiresAt).toLocaleDateString("es-ES")}</div>}
            </li>
          ))}
        </ul>
      )}

      <form action={sAction} className="space-y-2 border-t border-line/70 pt-4">
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="openSignup" defaultChecked={openSignup} className="mt-1 accent-brand-500" />
          <span>Alta abierta: cualquiera puede darse de alta en <span className="mono text-xs">{appUrl}/alta</span> sin invitación</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          Semanas de prueba por defecto
          <input name="defaultTrialWeeks" defaultValue={defaultTrialWeeks} inputMode="numeric" className="input w-20" />
        </label>
        {sState?.error && <Notice tone="error">{sState.error}</Notice>}
        {sState?.success && <Notice tone="success">{sState.success}</Notice>}
        <SubmitButton variant="ghost">Guardar</SubmitButton>
      </form>
    </div>
  );
}
