import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { canManageUser, invitableRoles, isAdmin, ROLE_LABELS, type Membership } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ActiveToggle } from "./active-toggle";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const session = await requireSession();
  const roles = invitableRoles(session.memberships);
  if (roles.length === 0) notFound(); // staff have no People page

  // Everything below is read as the signed-in person, so RLS limits it to their scope.
  const supabase = await supabaseServer();
  const [{ data: memberships }, { data: areas }, { data: stores }] = await Promise.all([
    supabase.from("memberships").select("user_id, role, organisation_id, area_id, store_id"),
    supabase.from("areas").select("id, name").order("name"),
    supabase.from("stores").select("id, name, cities(area_id)").order("name"),
  ]);
  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, is_active")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const areaName = new Map((areas ?? []).map((a) => [a.id, a.name]));
  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
  const storeAreas: Record<string, string> = {};
  for (const s of stores ?? []) {
    const c = s.cities as unknown as { area_id: string } | null;
    if (c) storeAreas[s.id] = c.area_id;
  }

  const myStoreIds = new Set(session.memberships.filter((m) => m.role === "bureau_manager").map((m) => m.store_id));
  const inviteStores = (stores ?? []).filter((s) => {
      if (isAdmin(session.memberships)) return true;
      const isAm = session.memberships.some((m) => m.role === "area_manager" && m.area_id === storeAreas[s.id]);
      return isAm || myStoreIds.has(s.id);
    });

  const people = (profiles ?? []).map((p) => {
    const theirs = (memberships ?? []).filter((m) => m.user_id === p.user_id) as Membership[];
    return { ...p, memberships: theirs };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>

      <Card>
        <CardTitle>Invite someone</CardTitle>
        <CardDescription>Accounts are invitation-only. You can invite people up to the level shown.</CardDescription>
        <div className="mt-4">
          <InviteForm
            roles={[...roles].reverse() /* lowest first, so the form never defaults to Admin */}
            areas={(areas ?? []).map((a) => ({ id: a.id, name: a.name }))}
            stores={inviteStores.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>People in your scope</CardTitle>
        {people.length === 0 ? (
          <EmptyState title="Nobody here yet" hint="Invite someone above." />
        ) : (
          <Table className="mt-3">
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Role and scope</TH>
                <TH>Status</TH>
                <TH><span className="sr-only">Actions</span></TH>
              </TR>
            </THead>
            <TBody>
              {people.map((p) => {
                const manage = canManageUser(session.userId, session.memberships, p.user_id, p.memberships, storeAreas);
                return (
                  <TR key={p.user_id}>
                    <TD>
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-xs text-muted">{p.email}</div>
                    </TD>
                    <TD>
                      {p.memberships.map((m, i) => (
                        <div key={i}>
                          {ROLE_LABELS[m.role]}
                          <span className="text-muted">
                            {" · "}
                            {m.role === "admin"
                              ? "Everything"
                              : m.area_id
                                ? areaName.get(m.area_id)
                                : m.store_id
                                  ? storeName.get(m.store_id)
                                  : ""}
                          </span>
                        </div>
                      ))}
                    </TD>
                    <TD>{p.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Switched off</Badge>}</TD>
                    <TD className="text-right">
                      {manage.ok ? <ActiveToggle userId={p.user_id} active={p.is_active} name={p.full_name} /> : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
