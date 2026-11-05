import { handleTap } from "@/lib/redirect/handle";

export const dynamic = "force-dynamic";

/** NFC tags are written with <PUBLIC_APP_URL>/t/<code>. */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleTap(request, code, "nfc");
}
