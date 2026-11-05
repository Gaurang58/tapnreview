import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { publicAppUrl } from "@/lib/env";
import { PUBLIC_CODE_PATTERN } from "@/lib/codes";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * QR image for a tag: /api/qr/<code>?format=svg|png[&download=1].
 * Only signed-in people who can see the tag may fetch it (Row Level Security decides).
 * The QR encodes <PUBLIC_APP_URL>/q/<code>, so it counts as a QR scan, not an NFC tap.
 */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!PUBLIC_CODE_PATTERN.test(code)) return new NextResponse("Not found", { status: 404 });

  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return new NextResponse("Sign in required", { status: 401 });
  const { data: tag } = await supabase.from("tags").select("label").eq("public_code", code).maybeSingle();
  if (!tag) return new NextResponse("Not found", { status: 404 });

  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "png" ? "png" : "svg";
  const target = `${publicAppUrl()}/q/${code}`;
  const filename = `${tag.label.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tag"}-qr.${format}`;
  const disposition = params.get("download") ? `attachment; filename="${filename}"` : "inline";

  // Error correction M, 4-module quiet zone: robust on a printed sticker and still sparse.
  const body: BodyInit =
    format === "png"
      ? new Uint8Array(await QRCode.toBuffer(target, { type: "png", width: 1024, margin: 4, errorCorrectionLevel: "M" }))
      : await QRCode.toString(target, { type: "svg", margin: 4, errorCorrectionLevel: "M" });

  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "image/svg+xml",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
