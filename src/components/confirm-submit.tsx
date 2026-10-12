"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

/** Botón de envío que pide confirmación antes. */
export function ConfirmSubmit({ children, confirm: text, variant = "primary", className }: {
  children: React.ReactNode;
  confirm: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(text)) e.preventDefault();
      }}
      className={clsx(variant === "primary" ? "btn-primary" : "btn-ghost", variant === "danger" && "text-rose-500", className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
