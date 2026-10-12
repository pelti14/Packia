import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="text-3xl font-bold">Esta caja está vacía</h1>
      <p className="text-ink-500">La página que buscas no existe.</p>
      <Link href="/" className="btn-primary">Volver al panel</Link>
    </div>
  );
}
