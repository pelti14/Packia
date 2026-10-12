"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { syncStoreAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function SyncButton({ storeId, showResult = true }: { storeId: string; showResult?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(() => syncStoreAction(storeId), undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1.5">
      <SubmitButton variant="ghost"><RefreshCw className="h-4 w-4" /> Sincronizar</SubmitButton>
      {showResult && state?.success && <span className="text-xs text-mint-600">{state.success}</span>}
      {showResult && state?.error && <span className="max-w-xs text-right text-xs text-rose-500">{state.error}</span>}
    </form>
  );
}
