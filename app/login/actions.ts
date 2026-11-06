"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirects";
import { supabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  email: z.email("Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match. Check them and try again." };

  const { data: user } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("user_id", user.user?.id ?? "")
    .maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "This account has been switched off. Please contact your manager." };
  }

  redirect(safeNext(formData.get("next")));
}
