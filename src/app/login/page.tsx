import { Boxes, PackageCheck, Truck } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandWordmark, Logo, LogoMark } from "@/components/logo";
import { needsSetup } from "@/lib/setup";
import { LoginForm } from "./login-form";
import { FrameNotice } from "./frame-notice";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await needsSetup()) redirect("/setup");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "linear-gradient(to right, rgb(255 255 255 / .12) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / .12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)",
          }}
        />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-10 w-10 ring-2 ring-white/40 rounded-[11px]" />
          <BrandWordmark plain className="font-display text-2xl font-bold" />
        </div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-5xl font-bold leading-[1.05]">Tú vendes.<br /><span className="text-brand-400">Nosotros lo enviamos.</span></h1>
          <p className="mt-5 text-lg text-white/80">Recepción, almacenaje, preparación y envío para tiendas Shopify y WooCommerce.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: Boxes, label: "Recepción" },
              { icon: PackageCheck, label: "Preparación" },
              { icon: Truck, label: "Salida" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
                <Icon className="h-5 w-5 text-brand-400" />
                <div className="mt-2 text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="glass relative w-full max-w-md p-8 sm:p-10">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <FrameNotice>
            <LoginForm next={next} error={error} />
          </FrameNotice>
        </div>
      </div>
    </div>
  );
}
