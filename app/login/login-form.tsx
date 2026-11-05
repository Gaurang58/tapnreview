"use client";

import { useActionHandler } from "@/components/forms/use-action-handler";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, pending } = useActionHandler(signIn);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
