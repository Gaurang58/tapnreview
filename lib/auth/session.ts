import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Membership } from "@/lib/auth/roles";

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  organisationName: string | null;
  memberships: Membership[];
};

/** The signed-in person, or null. Cached for the length of one request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await supabaseServer();
  // getUser asks Supabase to validate the token, so a deactivated login is noticed.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const [{ data: profile }, { data: memberships }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, is_active").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("my_memberships"),
    supabase.from("organisations").select("name").limit(1).maybeSingle(),
  ]);

  if (!profile || !profile.is_active) return null;
  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    organisationName: org?.name ?? null,
    memberships: (memberships ?? []) as Membership[],
  };
});

/** For pages and actions that need a signed-in, active person with at least one role. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/auth/inactive"); // clears the cookie, then goes to /login
  if (session.memberships.length === 0) redirect("/auth/inactive?reason=no-access");
  return session;
}
