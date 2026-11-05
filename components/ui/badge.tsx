import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "nfc" | "qr" | "demo" | "danger" | "lime";

const tones: Record<Tone, string> = {
  neutral: "border hairline text-muted",
  nfc: "bg-nfc/10 text-nfc border border-nfc/30",
  qr: "bg-qr/10 text-[#8a5a12] dark:text-qr border border-qr/40",
  demo: "bg-qr/15 text-[#8a5a12] dark:text-qr border border-qr/40",
  danger: "bg-danger/10 text-danger border border-danger/30",
  lime: "bg-lime text-board",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function MethodBadge({ method }: { method: "nfc" | "qr" }) {
  return <Badge tone={method}>{method === "nfc" ? "NFC tap" : "QR scan"}</Badge>;
}
