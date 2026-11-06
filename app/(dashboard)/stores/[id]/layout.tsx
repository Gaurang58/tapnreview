import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A store you can't see is a real 404. The check lives here, in the layout, so it runs
 * before the page's loading skeleton starts streaming; otherwise the browser would get
 * "200 OK" with a not-found screen. (The page still checks too: this is only about the status.)
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("id").eq("id", id).maybeSingle();
  if (!store) notFound();
  return children;
}
