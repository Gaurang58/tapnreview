"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { explainDbError } from "@/lib/auth/db-errors";
import { highestRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { newPublicCode } from "@/lib/codes";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms/action-form";

// Run as the signed-in person: Row Level Security decides who may touch which tag.
const id = z.uuid();
const label = z.string().trim().min(2, "Enter a name of at least 2 characters.").max(80, "That name is too long.");

async function requireTagManager() {
  const session = await requireSession();
  return highestRole(session.memberships) === "staff" ? null : session;
}

export async function createTag(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await requireTagManager())) return { error: "You don't have permission to add tags." };
  const storeId = id.safeParse(fd.get("storeId"));
  if (!storeId.success) return { error: "Choose a store." };

  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId.data).maybeSingle();
  if (!store) return { error: "You can't add tags to that store." };

  const typed = String(fd.get("label") ?? "").trim();
  const name = typed ? label.safeParse(typed) : { success: true as const, data: `${store.name} tag` };
  if (!name.success) return { error: name.error.issues[0]!.message };

  // The code is random; on the astronomically unlikely clash, just draw again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase
      .from("tags")
      .insert({ store_id: storeId.data, label: name.data, public_code: newPublicCode() });
    if (!error) {
      revalidatePath("/tags");
      return { ok: `Created “${name.data}”.` };
    }
    if (error.code !== "23505") return { error: explainDbError(error, "tag") };
  }
  return { error: "Couldn't create a unique code. Please try again." };
}

export async function renameTag(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await requireTagManager())) return { error: "You don't have permission to change tags." };
  const tagId = id.safeParse(fd.get("id"));
  const name = label.safeParse(fd.get("label"));
  if (!tagId.success || !name.success) return { error: name.success ? "Unknown tag." : name.error.issues[0]!.message };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("tags").update({ label: name.data }).eq("id", tagId.data).select("id");
  if (error) return { error: explainDbError(error, "tag") };
  if (!data?.length) return { error: "You don't have permission to change that tag." };
  revalidatePath("/tags");
  return { ok: "Renamed." };
}

export async function setTagActive(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await requireTagManager())) return { error: "You don't have permission to change tags." };
  const tagId = id.safeParse(fd.get("id"));
  if (!tagId.success) return { error: "Unknown tag." };
  const active = fd.get("active") === "true";

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("tags").update({ is_active: active }).eq("id", tagId.data).select("id");
  if (error) return { error: explainDbError(error, "tag") };
  if (!data?.length) return { error: "You don't have permission to change that tag." };
  revalidatePath("/tags");
  return { ok: active ? "Switched on." : "Switched off." };
}

export async function moveTag(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await requireTagManager())) return { error: "You don't have permission to move tags." };
  const tagId = id.safeParse(fd.get("id"));
  const storeId = id.safeParse(fd.get("storeId"));
  if (!tagId.success || !storeId.success) return { error: "Choose a store to move it to." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("tags").update({ store_id: storeId.data }).eq("id", tagId.data).select("id");
  if (error) return { error: explainDbError(error, "tag") };
  if (!data?.length) return { error: "You don't have permission to move that tag to that store." };
  revalidatePath("/tags");
  // Past taps stay with the store they were made at; only new taps follow the tag.
  return { ok: "Moved. New taps now count for the new store; past taps keep their old store." };
}

export async function retireTag(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await requireTagManager())) return { error: "You don't have permission to retire tags." };
  const tagId = id.safeParse(fd.get("id"));
  if (!tagId.success) return { error: "Unknown tag." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("tags")
    .update({ retired_at: new Date().toISOString() })
    .eq("id", tagId.data)
    .is("retired_at", null)
    .select("id");
  if (error) return { error: explainDbError(error, "tag") };
  if (!data?.length) return { error: "That tag can't be retired (already retired, or not yours)." };
  revalidatePath("/tags");
  return { ok: "Retired. The card now shows “not active” to anyone who taps it." };
}
