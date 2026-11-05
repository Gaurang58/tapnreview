"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { setPassword } from "./actions";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-describedby="password-hint" />
      </Field>
      <Field label="Repeat the password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}
