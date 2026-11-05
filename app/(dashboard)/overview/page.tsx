import type { Metadata } from "next";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

/** Placeholder until milestone 6 adds the tap board, KPIs and charts. */
export default async function OverviewPage() {
  const session = await requireSession();
  const supabase = await supabaseServer();
  const [{ data: areas }, { data: stores }] = await Promise.all([
    supabase.from("areas").select("name").order("name"),
    supabase.from("stores").select("name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {session.fullName}</h1>
      <Card>
        <CardTitle>What you can see</CardTitle>
        <CardDescription>
          {session.memberships.map((m) => ROLE_LABELS[m.role]).join(", ")}. The tap board and charts arrive in the
          next stage.
        </CardDescription>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Areas</dt>
            <dd>{areas?.length ? areas.map((a) => a.name).join(", ") : "None yet"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Stores</dt>
            <dd>{stores?.length ? stores.map((s) => s.name).join(", ") : "None yet"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
