/**
 * Link-preview and crawler user agents. When a tag link is pasted into a chat,
 * the chat app fetches it to build a preview; that must not count as a tap.
 */
const BOT_PATTERNS: RegExp[] = [
  /whatsapp/i,
  /slackbot/i,
  /slack-imgproxy/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /telegrambot/i,
  /discordbot/i,
  /linkedinbot/i,
  /googlebot/i,
  /google-inspectiontool/i,
  /bingbot/i,
  /bingpreview/i,
  /duckduckbot/i,
  /yandex(bot|images)/i,
  /baiduspider/i,
  /applebot/i,
  /pinterest(bot)?/i,
  /skypeuripreview/i,
  /iframely/i,
  /embedly/i,
  /redditbot/i,
  /\bbot\b/i,
  /crawler/i,
  /spider/i,
  /preview/i,
  /headlesschrome/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
];

// Not listed on purpose: Snapchat, Viber and similar names also appear in the
// in-app browsers real customers use. Their genuine preview fetchers carry
// "preview" or "bot" in the agent and are caught by the generic patterns above.
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // Real phones always send one.
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}
