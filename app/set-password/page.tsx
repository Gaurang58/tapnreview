import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { supabaseServer } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default async function SetPasswordPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?error=link");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <p className="mb-6 text-lg font-semibold">Tap Review</p>
      <Card>
        <h1 className="text-xl font-semibold">Choose a password</h1>
        <p className="mb-4 mt-1 text-sm text-muted">Signed in as {data.user.email}. You&apos;ll use this to sign in from now on.</p>
        <SetPasswordForm />
      </Card>
    </main>
  );
}
