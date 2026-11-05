"use client";

import { useEffect, useRef, useState } from "react";
import { useActionHandler } from "@/components/forms/use-action-handler";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { inviteUser } from "./actions";

type Option = { id: string; name: string };

export function InviteForm({ roles, areas, stores }: { roles: Role[]; areas: Option[]; stores: Option[] }) {
  const { state, onSubmit, pending } = useActionHandler(inviteUser);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.link) formRef.current?.reset(); // clear only after a success
  }, [state]);
  const [role, setRole] = useState<Role>(roles[0]!);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {state?.error ? <Alert tone="error" className="sm:col-span-2">{state.error}</Alert> : null}
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" name="fullName" autoComplete="off" required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="off" required />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        {role === "area_manager" ? (
          <Field label="Area" htmlFor="areaId">
            <Select id="areaId" name="areaId" required defaultValue="">
              <option value="" disabled>Choose an area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        ) : null}
        {role === "bureau_manager" || role === "staff" ? (
          <Field label="Store" htmlFor="storeId">
            <Select id="storeId" name="storeId" required defaultValue="">
              <option value="" disabled>Choose a store</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</Button>
        </div>
      </form>

      {state?.link ? (
        <Alert tone="success">
          <p className="font-medium">Invitation ready for {state.email}</p>
          <p className="mt-1 text-ink-muted">Send them this one-time link. It lets them choose a password.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={state.link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.link!);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
