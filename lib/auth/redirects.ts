/**
 * Where to send someone after signing in or out. Only same-site paths are ever
 * followed, so a crafted link can't bounce a person to another website.
 */
export function safeNext(value: unknown, fallback = "/overview"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** After signing out: the home page or the sign-in page, nothing else. */
export function signOutTarget(value: unknown): "/" | "/login" {
  return value === "/" ? "/" : "/login";
}
