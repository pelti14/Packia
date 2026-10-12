"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

/**
 * Dentro del admin de Shopify (u otro iframe) el navegador bloquea las cookies de sesión
 * y el login no puede funcionar: ofrecemos abrir Packia en una pestaña normal.
 */
export function FrameNotice({ children }: { children: React.ReactNode }) {
  const [framed, setFramed] = useState(false);
  useEffect(() => {
    try {
      setFramed(window.self !== window.top);
    } catch {
      setFramed(true); // acceder a window.top desde otro dominio lanza error: estamos en un iframe
    }
  }, []);

  if (!framed) return <>{children}</>;
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-ink-900">Abre Packia en una pestaña</h2>
      <p className="text-sm leading-relaxed text-ink-700">
        Estás viendo Packia dentro de otra web (por ejemplo, el admin de Shopify). Por seguridad, el navegador no deja iniciar sesión aquí dentro.
      </p>
      <a href="/login" target="_blank" rel="noopener" className="btn-primary w-full py-3">
        Abrir Packia en una pestaña nueva <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
