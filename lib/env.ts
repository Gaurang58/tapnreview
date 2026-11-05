/**
 * Configuration comes only from environment variables. Public values are safe
 * in the browser; everything else must be read through server-only modules.
 * Values are read when first used (not at import time) so `next build` works
 * on a machine without secrets.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
};

/** Base URL baked into QR codes and NFC links. One variable, one place. */
export function publicAppUrl(): string {
  return required("PUBLIC_APP_URL", process.env.PUBLIC_APP_URL).replace(/\/+$/, "");
}
