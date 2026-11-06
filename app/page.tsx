import Link from "next/link";
import {
  BarChart3,
  Building2,
  Clock,
  Download,
  MapPin,
  Nfc,
  QrCode,
  Radio,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton, WhoAmI } from "@/components/auth/signed-in-panel";
import { getSession } from "@/lib/auth/session";

const STEPS = [
  {
    icon: Nfc,
    tone: "text-nfc",
    title: "Tap the card",
    text: "A card sits on the bureau glass. A customer holds their phone to it. Android and iPhone both work, with no app to install.",
  },
  {
    icon: QrCode,
    tone: "text-qr",
    title: "Or scan the code",
    text: "The same card carries a QR code for phones without NFC, or for anyone who prefers the camera.",
  },
  {
    icon: Smartphone,
    tone: "",
    title: "Land on Google",
    text: "They arrive on that store's own Google “write a review” page in one step. No ratings screen, no sign-up, nothing in between.",
  },
];

const SEE = [
  {
    icon: Radio,
    title: "A live tap board",
    text: "Watch taps and scans arrive as they happen, with today's count and the latest activity across your stores.",
  },
  {
    icon: MapPin,
    title: "Area, city and store",
    text: "Compare any level of the business side by side, or open a single store to see each card on its own.",
  },
  {
    icon: BarChart3,
    title: "Trends over time",
    text: "Daily charts with a comparison against the previous period, so a quiet week or a strong one is easy to spot.",
  },
  {
    icon: Clock,
    title: "Busiest times",
    text: "A day-and-hour map shows when customers engage most, which helps stores time the ask.",
  },
  {
    icon: Download,
    title: "Export when you need it",
    text: "Download daily and per-store figures as CSV for reports and meetings.",
  },
  {
    icon: Building2,
    title: "Cards you control",
    text: "Add or retire cards, download QR codes for printing, and see which card was last used.",
  },
];

const ROLES = [
  { name: "Admin", text: "Sees every store, manages the structure, cards and people, and can read the audit log." },
  { name: "Area manager", text: "Sees their own area: its cities and stores, and can invite people for their stores." },
  { name: "Bureau manager", text: "Sees their own store and its cards, with the same live board." },
  { name: "Staff", text: "A simple view of their own store's taps. No settings, no one else's data." },
];

const PRINCIPLES = [
  "Every customer gets the same journey straight to Google. No filtering by rating, ever.",
  "No incentives, discounts or prizes for leaving a review.",
  "No staff names, targets or leaderboards, so nobody is ranked against a colleague.",
  "No customer personal data. Visitors are counted, not identified.",
  "Taps and scans measure intent to review. They are not a count of reviews posted.",
];

export default async function HomePage() {
  const session = await getSession();
  const signedIn = session && session.memberships.length > 0 ? session : null;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-semibold">Tap Review</span>
        {signedIn ? (
          <div className="flex flex-wrap items-center gap-3">
            <WhoAmI session={signedIn} />
            <Link href="/overview" className={buttonVariants({ variant: "default", size: "sm" })}>
              Open dashboard
            </Link>
            <SignOutButton to="/" variant="ghost">
              Sign out
            </SignOutButton>
          </div>
        ) : (
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Sign in
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="mt-10">
        <div className="tap-board p-6 sm:p-10">
          <p className="tap-board-text text-xs opacity-80">Tap or scan to review</p>
          <p className="tap-board-text mt-3 text-4xl sm:text-6xl">ONE TAP. STRAIGHT TO GOOGLE.</p>
        </div>
        <h1 className="mt-10 max-w-2xl text-3xl font-semibold sm:text-4xl">
          A card on the counter, not a card in a pocket
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Handing customers a card and asking them to review later rarely works. Tap Review puts an NFC and QR card on
          the bureau glass, takes the customer to the store&apos;s Google review page in one step, and shows you how
          often it happens.
        </p>
        {signedIn ? null : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              Sign in to the dashboard
            </Link>
            <a href="#how" className={buttonVariants({ variant: "secondary" })}>
              See how it works
            </a>
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="mt-16 scroll-mt-6">
        <h2 className="text-2xl font-semibold">How it works for a customer</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-5">
              <div className="flex items-center justify-between">
                <s.icon className={s.tone} aria-hidden="true" />
                <span className="text-sm text-muted">Step {i + 1}</span>
              </div>
              <p className="mt-3 font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Behind the scenes, every tap and scan passes through Tap Review for a moment on its way to Google, which is
          how it is counted. The whole hop takes a fraction of a second.
        </p>
      </section>

      {/* What you see */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold">What the dashboard shows you</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Everything is counted by card, store, city and area, and repeat taps from the same phone are filtered out so
          the numbers stay honest.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEE.map((f) => (
            <li key={f.title} className="panel p-5">
              <f.icon aria-hidden="true" />
              <p className="mt-3 font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Roles */}
      <section className="mt-16">
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" />
          <h2 className="text-2xl font-semibold">The right view for each person</h2>
        </div>
        <p className="mt-2 max-w-2xl text-muted">
          Access follows the business: organisation, area, store. People only ever see the part they are responsible
          for, and that is enforced in the database itself, not just on screen.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.name} className="panel p-5">
              <dt className="font-medium">{r.name}</dt>
              <dd className="mt-1 text-sm text-muted">{r.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">Sign-in is by invitation only. There is no public sign-up.</p>
      </section>

      {/* Principles */}
      <section className="mt-16">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" />
          <h2 className="text-2xl font-semibold">Fair by design</h2>
        </div>
        <ul className="panel mt-5 divide-y divide-[var(--line)]">
          {PRINCIPLES.map((p) => (
            <li key={p} className="px-5 py-3 text-sm">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-6 text-sm text-muted">
        <span>Tap Review &middot; for TravelEx bureaux</span>
        {signedIn ? (
          <Link href="/overview" className="underline underline-offset-4">
            Open dashboard
          </Link>
        ) : (
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        )}
      </footer>
    </main>
  );
}
