"use client";

import { useRef } from "react";

/**
 * Abre la etiqueta para imprimirla nada más crearla. La ventana se abre en el clic
 * (si no, el navegador la bloquea) y se le pone la dirección cuando la etiqueta está lista.
 */
export function usePrintWindow(enabled: boolean) {
  const ref = useRef<Window | null>(null);
  return {
    open() {
      if (!enabled) return;
      const w = window.open("", "_blank");
      if (w) w.document.write('<p style="font:16px system-ui,sans-serif;padding:24px">Generando etiqueta…</p>');
      ref.current = w;
    },
    go(url: string) {
      if (ref.current) ref.current.location.href = url;
      ref.current = null;
    },
    cancel() {
      ref.current?.close();
      ref.current = null;
    },
  };
}
