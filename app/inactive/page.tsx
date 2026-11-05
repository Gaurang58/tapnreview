import type { Metadata } from "next";

export const metadata: Metadata = { title: "Card not active" };

/** Shown instead of a raw error when a tag or store is missing or switched off. */
export default function InactivePage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-6">
      <div className="panel max-w-sm p-6 text-center">
        <p className="text-lg font-semibold">This card isn&apos;t active right now.</p>
        <p className="mt-2 text-muted">Please ask a member of staff.</p>
      </div>
    </main>
  );
}
