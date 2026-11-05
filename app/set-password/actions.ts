"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import type { FormState } from "@/app/login/actions";

const schema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your password." };

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your link has expired. Ask for a new invitation." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "That password was refused. Try a longer or less common one." };
  redirect("/overview");
}
