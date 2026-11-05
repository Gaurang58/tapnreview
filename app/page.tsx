import Link from "next/link";
import { Nfc, QrCode, BarChart3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold">Tap Review</span>
        <Link href="/login" className={buttonVariants({ variant: "default" })}>
          Sign in
        </Link>
      </header>

      <section className="mt-12">
        <div className="tap-board p-6 sm:p-8">
          <p className="tap-board-text text-xs opacity-80">Tap or scan to review</p>
          <p className="tap-board-text mt-3 text-4xl sm:text-5xl">ONE TAP. STRAIGHT TO GOOGLE.</p>
        </div>

        <h1 className="mt-10 text-2xl font-semibold">A card on the counter, not a card in a pocket</h1>
        <p className="mt-3 text-muted">
          Staff hand out printed cards and ask customers to review the bureau later. Most forget. Tap Review puts
          an NFC and QR card on the bureau glass. A customer taps or scans with their own phone and lands on that
          store&apos;s Google &ldquo;write a review&rdquo; page in one step. Every tap and scan passes through Tap
          Review first, so you can see how customers engage by tag, store, city and area, day by day.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          <li className="panel p-4">
            <Nfc className="text-nfc" aria-hidden="true" />
            <p className="mt-2 font-medium">Tap</p>
            <p className="text-sm text-muted">Hold a phone to the card. Android and iPhone both work.</p>
          </li>
          <li className="panel p-4">
            <QrCode className="text-qr" aria-hidden="true" />
            <p className="mt-2 font-medium">Scan</p>
            <p className="text-sm text-muted">Point the camera at the QR code for phones without NFC.</p>
          </li>
          <li className="panel p-4">
            <BarChart3 aria-hidden="true" />
            <p className="mt-2 font-medium">See intent</p>
            <p className="text-sm text-muted">Taps and scans measure intent to review, counted live.</p>
          </li>
        </ul>

        <p className="mt-8 text-xs text-muted">
          Every customer gets the same journey. No ratings screen, no staff names, no incentives: just Google&apos;s
          own review page.
        </p>
      </section>
    </main>
  );
}
