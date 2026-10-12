import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { MigrateForm } from "@/app/setup/forms";
import { signOut } from "@/app/auth-actions";

/** Se muestra cuando hay una versión nueva con cambios de base de datos pendientes. */
export function UpdateScreen({ isAdmin, count }: { isAdmin: boolean; count: number }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <Card className="relative w-full max-w-lg space-y-5 p-8">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-2.5 ring-1 ring-brand-100"><RefreshCw className="h-5 w-5 text-brand-600" /></div>
          <h1 className="text-2xl font-bold">Actualización pendiente</h1>
        </div>
        {isAdmin ? (
          <>
            <p className="text-sm text-ink-700">
              Has instalado una versión nueva de Packia que necesita actualizar la base de datos ({count} {count === 1 ? "cambio" : "cambios"}). Tus datos se mantienen.
            </p>
            <MigrateForm label="Actualizar ahora" />
            <p className="text-xs text-ink-500">Al terminar entrarás automáticamente. Si no, <a href="/" className="font-medium text-brand-600 hover:underline">pulsa aquí</a>.</p>
          </>
        ) : (
          <p className="text-sm text-ink-700">Packia se está actualizando. Avisa al administrador para que complete la actualización y vuelve a entrar en unos minutos.</p>
        )}
        <form action={signOut}>
          <button className="text-xs text-ink-400 hover:text-ink-700">Cerrar sesión</button>
        </form>
      </Card>
    </div>
  );
}
