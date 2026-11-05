"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setUserActive } from "./actions";

export function ActiveToggle({ userId, active, name }: { userId: string; active: boolean; name: string }) {
  const [state, action, pending] = useActionState(setUserActive, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (active && !window.confirm(`Switch off ${name}? They won't be able to sign in.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={String(!active)} />
      <Button type="submit" size="sm" variant={active ? "secondary" : "default"} disabled={pending}>
        {active ? "Switch off" : "Switch on"}
      </Button>
      {state?.error ? <p role="alert" className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
