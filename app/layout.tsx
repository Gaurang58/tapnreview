import type { Metadata, Viewport } from "next";
import { Doto, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

const doto = Doto({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-doto",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Tap Review", template: "%s · Tap Review" },
  description:
    "Tap or scan the card on the counter and go straight to the store's Google review page.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${schibsted.variable} ${doto.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-50 rounded bg-panel px-3 py-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
