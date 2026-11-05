import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  inactive: "That account is switched off, or the session ended. Please contact your manager.",
  "no-access": "Your account has no role yet. Please ask whoever invited you.",
  link: "That link has expired or was already used. Ask for a new invitation.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-6 text-lg font-semibold">
        Tap Review
      </Link>
      <Card>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mb-4 mt-1 text-sm text-muted">Accounts are by invitation only.</p>
        {error && NOTICES[error] ? <Alert tone="error" className="mb-4">{NOTICES[error]}</Alert> : null}
        <LoginForm next={next} />
      </Card>
    </main>
  );
}
