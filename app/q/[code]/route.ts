import { handleTap } from "@/lib/redirect/handle";

export const dynamic = "force-dynamic";

/** QR codes encode <PUBLIC_APP_URL>/q/<code>. */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleTap(request, code, "qr");
}
