import { createHash } from "node:crypto";

/**
 * A short, salted, daily-rotating fingerprint used only to spot repeat taps
 * within 30 minutes. The salt changes every day, so the same phone produces a
 * different hash tomorrow, and raw IP addresses are never stored anywhere.
 */
export function visitorHash(ip: string, userAgent: string, salt: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${userAgent}|${salt}|${day}`).digest("hex").slice(0, 24);
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}
