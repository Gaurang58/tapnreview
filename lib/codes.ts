import { randomInt } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * A tag's public code: 10 random base-62 characters from a cryptographic source.
 * Short, so the QR code stays sparse and scans reliably. Once printed it never changes.
 */
export function newPublicCode(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += BASE62[randomInt(62)];
  return out;
}

export const PUBLIC_CODE_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
