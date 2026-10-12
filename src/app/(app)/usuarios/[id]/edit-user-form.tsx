"use client";

import { startTransition, useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateUser, type FormState } from "@/app/actions";
import { Notice } from "@/components/ui";

type Initial = { email: string; name: string; role: string; clientId: string };

export function EditUserForm({ id, initial, clients, isMe }: { id: string; initial: Initial; clients: { id: string; name: string }[]; isMe: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateUser.bind(null, id), undefined);
  const v = { ...initial, ...(state?.values ?? {}) };
  const [role, setRole] = useState(v.role);
  return (
    // Envío sin el reinicio automático de React: así el formulario muestra lo guardado.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="glass max-w-2xl space-y-4 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input id="name" name="name" defaultValue={v.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email (para entrar)</label>
          <input id="email" name="email" type="email" defaultValue={v.email} className="input" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)} className="input" disabled={isMe}>
          <option value="STAFF">Almacén: opera salida, recepción y devoluciones</option>
          <option value="ADMIN">Administrador: todo, incluida facturación</option>
          <option value="CLIENT">Cliente: solo ve los datos de su empresa</option>
        </select>
        {isMe && (
          <>
            <input type="hidden" name="role" value="ADMIN" />
            <p className="mt-1.5 text-xs text-ink-400">No puedes cambiar tu propio rol.</p>
          </>
        )}
      </div>
      {role === "CLIENT" && (
        <div>
          <label className="label" htmlFor="clientId">Empresa</label>
          <select id="clientId" name="clientId" defaultValue={v.clientId} className="input" required>
            <option value="">Elige…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">Contraseña nueva (opcional)</label>
        <input id="password" name="password" type="text" minLength={8} className="input mono" placeholder="En blanco = no cambiar" autoComplete="new-password" />
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <button type="submit" disabled={pending} className="btn-primary">
        <Save className="h-4 w-4" /> {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
