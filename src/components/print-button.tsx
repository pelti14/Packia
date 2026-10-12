"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost print:hidden">
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
