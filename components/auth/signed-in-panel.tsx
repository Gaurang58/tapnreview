import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { highestRole, ROLE_LABELS } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/** "Signed in as Demo Staff · Staff", with a plain way to sign out. */
export function WhoAmI({ session }: { session: Session }) {
  const top = highestRole(session.memberships);
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span>
        Signed in as <strong className="font-semibold">{session.fullName}</strong>
      </span>
      {top ? <Badge>{ROLE_LABELS[top]}</Badge> : null}
    </span>
  );
}

export function SignOutButton({ to, children, variant = "secondary" }: { to: "/" | "/login"; children: React.ReactNode; variant?: "secondary" | "ghost" }) {
  return (
    <form action="/auth/signout" method="post">
      <input type="hidden" name="to" value={to} />
      <button type="submit" className={cn(buttonVariants({ variant, size: "sm" }))}>
        {children}
      </button>
    </form>
  );
}

/** Shown on the sign-in page when someone is already signed in. */
export function AlreadySignedIn({ session, next }: { session: Session; next: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">You&apos;re already signed in</h1>
        <p className="mt-2 text-sm">
          <WhoAmI session={session} />
        </p>
        <p className="mt-1 text-xs text-muted">{session.email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={next} className={buttonVariants({ variant: "default" })}>
          Continue to the dashboard
        </Link>
        <SignOutButton to="/login">Sign out and use a different account</SignOutButton>
      </div>
      <p className="text-xs text-muted">On a shared computer, sign out when you&apos;re done.</p>
    </div>
  );
}
