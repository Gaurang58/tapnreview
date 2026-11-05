"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canGrant, canManageUser, type Membership } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { publicAppUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type InviteState = { error?: string; link?: string; email?: string } | undefined;
export type ActionState = { error?: string; ok?: string } | undefined;

const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Enter their full name.").max(80),
  email: z.email("Enter a valid email address.").transform((v) => v.toLowerCase()),
  role: z.enum(["admin", "area_manager", "bureau_manager", "staff"]),
  areaId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  storeId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

/** area for each store, so scope checks can follow store -> city -> area. */
async function storeAreaMap(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin().from("stores").select("id, cities(area_id)");
  const map: Record<string, string> = {};
  for (const s of data ?? []) {
    const city = s.cities as unknown as { area_id: string } | null;
    if (city) map[s.id] = city.area_id;
  }
  return map;
}

/**
 * Invitations are created here, never from the browser. The inviter's rights are
 * checked first; only then is the secret key used to create the login and its
 * role. No email is sent: the inviter gets a one-time link to pass on.
 */
export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const session = await requireSession();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { fullName, email, role, areaId, storeId } = parsed.data;

  const storeAreas = await storeAreaMap();
  const decision = canGrant(session.memberships, {
    role,
    areaId: role === "area_manager" ? areaId : null,
    storeId: role === "bureau_manager" || role === "staff" ? storeId : null,
    storeAreaId: storeId ? storeAreas[storeId] : null,
  });
  if (!decision.ok) return { error: decision.reason };

  const admin = supabaseAdmin();
  let organisationId: string | null = null;
  if (role === "admin") {
    const { data: org } = await admin.from("organisations").select("id").limit(1).single();
    organisationId = org?.id ?? null;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: fullName } },
  });
  if (linkError || !link.user) {
    const taken = /already|registered|exists/i.test(linkError?.message ?? "");
    return { error: taken ? "That email already has an account." : "Couldn't create the invitation. Try again." };
  }

  const { error: memberError } = await admin.from("memberships").insert({
    user_id: link.user.id,
    role,
    organisation_id: organisationId,
    area_id: role === "area_manager" ? (areaId ?? null) : null,
    store_id: role === "bureau_manager" || role === "staff" ? (storeId ?? null) : null,
    created_by: session.userId,
  });
  if (memberError) {
    await admin.auth.admin.deleteUser(link.user.id); // don't leave a login with no role
    return { error: "Couldn't set that role. Nothing was created." };
  }

  await admin.from("audit_log").insert({
    actor_id: session.userId,
    action: "user.invited",
    entity: "profile",
    entity_id: link.user.id,
    details: {
      role,
      email,
      area_id: role === "area_manager" ? areaId : storeId ? storeAreas[storeId] : null,
      store_id: storeId ?? null,
    },
  });

  revalidatePath("/people");
  const url = `${publicAppUrl()}/auth/confirm?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=invite`;
  return { link: url, email };
}

/** Switch a login off (or back on). Blocks sign-in but keeps history. */
export async function setUserActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Unknown person." };
  const active = formData.get("active") === "true";

  const admin = supabaseAdmin();
  const { data: rows } = await admin
    .from("memberships")
    .select("role, organisation_id, area_id, store_id")
    .eq("user_id", userId.data);

  const decision = canManageUser(
    session.userId,
    session.memberships,
    userId.data,
    (rows ?? []) as Membership[],
    await storeAreaMap(),
  );
  if (!decision.ok) return { error: decision.reason };

  const { error } = await admin.from("profiles").update({ is_active: active }).eq("user_id", userId.data);
  if (error) return { error: "Couldn't update that account." };
  // Also stop Supabase issuing new sessions for a switched-off login.
  await admin.auth.admin.updateUserById(userId.data, { ban_duration: active ? "none" : "876000h" });

  await admin.from("audit_log").insert({
    actor_id: session.userId,
    action: active ? "user.reactivated" : "user.deactivated",
    entity: "profile",
    entity_id: userId.data,
    details: { area_id: (rows ?? []).map((r) => r.area_id).find(Boolean) ?? null },
  });
  revalidatePath("/people");
  return { ok: active ? "Switched back on." : "Switched off." };
}
