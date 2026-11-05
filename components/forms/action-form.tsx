"use client";

import { useEffect, useRef } from "react";
import { useActionHandler } from "@/components/forms/use-action-handler";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type ActionResult = { error?: string; ok?: string } | undefined;

/**
 * A small form wrapper for server actions: shows the action's message, disables the
 * button while it runs, and clears the fields after a success unless told not to.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  confirm,
  variant = "default",
  keepFields = false,
  size = "default",
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children?: React.ReactNode;
  className?: string;
  /** Ask before submitting, e.g. before retiring a tag. */
  confirm?: string;
  variant?: "default" | "secondary" | "danger" | "ghost";
  keepFields?: boolean;
  size?: "default" | "sm";
}) {
  const { state, onSubmit, pending } = useActionHandler(action, confirm);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && !keepFields) ref.current?.reset();
  }, [state, keepFields]);

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={cn("space-y-3", className)}
    >
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}
      {children}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
