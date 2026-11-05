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
  if (url.username || url.password || url.port) return false; // no "google.com@evil" tricks
  const host = url.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  // Country Google domains such as www.google.co.uk
  return /^(www\.)?google\.([a-z]{2,3})(\.[a-z]{2})?$/.test(host);
}

/** Google Place IDs are opaque strings; this is a loose shape check only. */
export function looksLikePlaceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(value.trim());
}

export type ReviewTarget = { ok: true; placeId: string | null; url: string } | { ok: false; error: string };

/**
 * What a manager typed for a store's Google link: a Place ID, or a pasted review
 * link (a link wins if both are given). Place IDs become the standard write-review link.
 */
export function resolveReviewTarget(placeIdInput: string, linkInput: string): ReviewTarget {
  const link = linkInput.trim();
  const placeId = placeIdInput.trim();
  if (link) {
    if (!isAllowedReviewUrl(link)) {
      return { ok: false, error: "That link isn't a Google address. Paste a Google review link, or use the Place ID." };
    }
    return { ok: true, placeId: placeId || null, url: link };
  }
  if (!placeId) return { ok: false, error: "Enter the store's Google Place ID, or paste its Google review link." };
  if (!looksLikePlaceId(placeId)) return { ok: false, error: "That doesn't look like a Place ID (letters, numbers, - and _ only)." };
  return { ok: true, placeId, url: reviewUrlFromPlaceId(placeId) };
}

export const PLACE_ID_FINDER_URL = "https://developers.google.com/maps/documentation/places/web-service/place-id";
