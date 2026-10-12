"use client";

import { useActionState } from "react";
import { Webhook } from "lucide-react";
import { registerWebhooksAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function WebhooksButton({ storeId }: { storeId: string }) {
  const [state, action] = useActionState<FormState, FormData>(() => registerWebhooksAction(storeId), undefined);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton variant="ghost"><Webhook className="h-4 w-4" /> Crear / revisar webhooks en Shopify</SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
    </form>
  );
}
