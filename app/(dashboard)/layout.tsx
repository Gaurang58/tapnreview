import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomNav, SideNav } from "@/components/dashboard/nav";
import { highestRole, navFor, ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const items = navFor(session.memberships).map(({ href, label, icon }) => ({ href, label, icon }));
  const top = highestRole(session.memberships);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r bg-panel p-4 hairline md:flex md:flex-col md:gap-6">
        <div>
          <Link href="/overview" className="text-lg font-semibold">
            Tap Review
          </Link>
          {session.organisationName ? <p className="text-xs text-muted">{session.organisationName}</p> : null}
        </div>
        <SideNav items={items} />
        <div className="mt-auto space-y-2 text-sm">
          <p className="font-medium">{session.fullName}</p>
          {top ? <Badge>{ROLE_LABELS[top]}</Badge> : null}
          <SignOut />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between border-b bg-panel px-4 py-3 hairline md:hidden">
          <div>
            <p className="font-semibold">Tap Review</p>
            {session.organisationName ? <p className="text-xs text-muted">{session.organisationName}</p> : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted min-[400px]:inline">{session.fullName}</span>
            <SignOut />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-[var(--fg)]">
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
