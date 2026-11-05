"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { explainDbError } from "@/lib/auth/db-errors";
import { highestRole, isAdmin } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { resolveReviewTarget } from "@/lib/redirect/url";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms/action-form";

// Every action runs as the signed-in person (not the secret key), so Row Level
// Security in the database is the real guard. The checks here give clearer messages.

const nameSchema = z.string().trim().min(2, "Enter a name of at least 2 characters.").max(80, "That name is too long.");
const id = z.uuid();

async function requireManager() {
  const session = await requireSession();
  const top = highestRole(session.memberships);
  if (top !== "admin" && top !== "area_manager") return { session, error: "Only admins and area managers can change this." };
  return { session, error: null };
}

function done(path = "/structure"): void {
  revalidatePath(path);
}

// --- areas -------------------------------------------------------------------
export async function createArea(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { session, error } = await requireManager();
  if (error) return { error };
  if (!isAdmin(session.memberships)) return { error: "Only admins can add areas." };
  const name = nameSchema.safeParse(fd.get("name"));
  if (!name.success) return { error: name.error.issues[0]!.message };

  const supabase = await supabaseServer();
  const { data: org } = await supabase.from("organisations").select("id").limit(1).single();
  if (!org) return { error: "No organisation found." };
  const { error: dbError } = await supabase.from("areas").insert({ organisation_id: org.id, name: name.data });
  if (dbError) return { error: explainDbError(dbError, "area") };
  done();
  return { ok: `Added ${name.data}.` };
}

export async function updateArea(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { session, error } = await requireManager();
  if (error) return { error };
  if (!isAdmin(session.memberships)) return { error: "Only admins can change areas." };
  const areaId = id.safeParse(fd.get("id"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!areaId.success || !name.success) return { error: name.success ? "Unknown area." : name.error.issues[0]!.message };

  const supabase = await supabaseServer();
  const { data, error: dbError } = await supabase
    .from("areas")
    .update({ name: name.data, is_active: fd.get("isActive") === "on" })
    .eq("id", areaId.data)
    .select("id");
  if (dbError) return { error: explainDbError(dbError, "area") };
  if (!data?.length) return { error: "You don't have permission to change that area." };
  done();
  return { ok: "Saved." };
}

// --- cities ------------------------------------------------------------------
export async function createCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { error } = await requireManager();
  if (error) return { error };
  const areaId = id.safeParse(fd.get("areaId"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!areaId.success || !name.success) return { error: name.success ? "Unknown area." : name.error.issues[0]!.message };

  const supabase = await supabaseServer();
  const { error: dbError } = await supabase.from("cities").insert({ area_id: areaId.data, name: name.data });
  if (dbError) return { error: explainDbError(dbError, "city") };
  done();
  return { ok: `Added ${name.data}.` };
}

export async function updateCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { error } = await requireManager();
  if (error) return { error };
  const cityId = id.safeParse(fd.get("id"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!cityId.success || !name.success) return { error: name.success ? "Unknown city." : name.error.issues[0]!.message };

  const supabase = await supabaseServer();
  const { data, error: dbError } = await supabase.from("cities").update({ name: name.data }).eq("id", cityId.data).select("id");
  if (dbError) return { error: explainDbError(dbError, "city") };
  if (!data?.length) return { error: "You don't have permission to change that city." };
  done();
  return { ok: "Saved." };
}

// --- stores ------------------------------------------------------------------
export async function createStore(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { error } = await requireManager();
  if (error) return { error };
  const cityId = id.safeParse(fd.get("cityId"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!cityId.success || !name.success) return { error: name.success ? "Unknown city." : name.error.issues[0]!.message };
  const target = resolveReviewTarget(String(fd.get("placeId") ?? ""), String(fd.get("link") ?? ""));
  if (!target.ok) return { error: target.error };

  const supabase = await supabaseServer();
  const { error: dbError } = await supabase.from("stores").insert({
    city_id: cityId.data,
    name: name.data,
    google_place_id: target.placeId,
    google_review_url: target.url,
  });
  if (dbError) return { error: explainDbError(dbError, "store") };
  done();
  return { ok: `Added ${name.data}.` };
}

export async function updateStore(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const { error } = await requireManager();
  if (error) return { error };
  const storeId = id.safeParse(fd.get("id"));
  const name = nameSchema.safeParse(fd.get("name"));
  if (!storeId.success || !name.success) return { error: name.success ? "Unknown store." : name.error.issues[0]!.message };
  const target = resolveReviewTarget(String(fd.get("placeId") ?? ""), String(fd.get("link") ?? ""));
  if (!target.ok) return { error: target.error };

  const supabase = await supabaseServer();
  const { data, error: dbError } = await supabase
    .from("stores")
    .update({
      name: name.data,
      google_place_id: target.placeId,
      google_review_url: target.url,
      is_active: fd.get("isActive") === "on",
    })
    .eq("id", storeId.data)
    .select("id");
  if (dbError) return { error: explainDbError(dbError, "store") };
  if (!data?.length) return { error: "You don't have permission to change that store." };
  done();
  return { ok: "Saved." };
}
