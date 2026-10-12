"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { createUser, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function UserForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createUser, undefined);
  const v = state?.values ?? {};
  const [role, setRole] = useState(v.role || "STAFF");
  return (
    <form action={action} className="space-y-4 px-5 py-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={v.email} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" name="name" defaultValue={v.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)} className="input">
          <option value="STAFF">Almacén: opera salida, recepción y devoluciones</option>
          <option value="ADMIN">Administrador: todo, incluida facturación</option>
          <option value="CLIENT">Cliente: solo ve los datos de su empresa</option>
        </select>
      </div>
      {role === "CLIENT" && (
        <div>
          <label className="label" htmlFor="clientId">Empresa</label>
          <select id="clientId" name="clientId" defaultValue={v.clientId} className="input" required>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">Contraseña temporal</label>
        <input id="password" name="password" type="text" minLength={8} className="input mono" placeholder="Mínimo 8 caracteres" required />
        <p className="mt-1.5 text-xs text-ink-400">Puede cambiarla con «¿Olvidaste tu contraseña?» en el login.</p>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <SubmitButton className="w-full"><UserPlus className="h-4 w-4" /> Crear usuario</SubmitButton>
    </form>
  );
}
