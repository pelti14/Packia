import Link from "next/link";
import { Logo } from "@/components/logo";
import { findInvite, signupOpen } from "@/lib/onboarding";
import { getPlans } from "@/lib/plans";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alta" };

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite: token } = await searchParams;
  const [invite, { open, trialWeeks }, plans] = await Promise.all([findInvite(token), signupOpen(), getPlans()]);
  const allowed = Boolean(invite) || open;
  const weeks = invite?.trialWeeks ?? trialWeeks;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass p-6 sm:p-8">
          {allowed ? (
            <>
              <h1 className="text-2xl font-bold text-ink-900">Da de alta tu tienda</h1>
              <p className="mt-1 text-sm text-ink-500">
                {weeks > 0 ? `${weeks} semanas de prueba gratis. ` : ""}Sin permanencia. Después conectas tu Shopify o WooCommerce en un clic y nos envías tu stock.
              </p>
              <div className="mt-6">
                <SignupForm
                  invite={token ?? ""}
                  email={invite?.email ?? undefined}
                  company={invite?.companyName ?? undefined}
                  fixedPlan={invite?.plan ?? undefined}
                  plans={plans.map((p) => ({ plan: p.plan, label: p.label, orders: p.orders, feeCents: p.feeCents }))}
                />
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <h1 className="text-xl font-bold text-ink-900">Este enlace de alta no es válido o ha caducado</h1>
              <p className="mt-2 text-sm text-ink-500">Pídenos un enlace nuevo y te damos de alta en minutos.</p>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Inicia sesión</Link></p>
      </div>
    </div>
  );
}
