/**
 * Only HTTPS links on Google's own hosts may be used as a store's review link,
 * so a compromised manager account cannot send customers to a scam page.
 */
const ALLOWED_HOSTS = new Set([
  "search.google.com",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "g.page",
  "maps.app.goo.gl",
  "goo.gl",
  "business.google.com",
]);

export function reviewUrlFromPlaceId(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`;
}

export function isAllowedReviewUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  // Country Google domains such as www.google.co.uk
  return /^(www\.)?google\.([a-z]{2,3})(\.[a-z]{2})?$/.test(host);
}

/** Google Place IDs are opaque strings; this is a loose shape check only. */
export function looksLikePlaceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(value.trim());
}
