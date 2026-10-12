"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export function SubmitButton({ children, variant = "primary", className }: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={clsx(variant === "primary" ? "btn-primary" : "btn-ghost", className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
