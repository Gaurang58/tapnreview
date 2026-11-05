"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Runs a server action from a form WITHOUT React's automatic form reset.
 * React 19 clears every field after an action finishes, even a failed one,
 * which would wipe what someone just typed because of one mistake. Here the
 * fields stay put; callers reset the form themselves after a success.
 */
export function useActionHandler<S>(
  action: (prev: S | undefined, formData: FormData) => Promise<S | undefined>,
  confirmMessage?: string,
) {
  const [state, run, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => run(formData));
  }
  return { state, onSubmit, pending };
}
