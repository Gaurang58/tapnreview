import { notFound } from "next/navigation";
import { highestRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

/**
 * Only admins and area managers have an audit log. The check lives here, in the layout,
 * so it runs before the page's loading skeleton starts streaming; otherwise a refused
 * visitor would get a "200 OK" status with a not-found screen instead of a real 404.
 */
export default async function AuditLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const top = highestRole(session.memberships);
  if (top !== "admin" && top !== "area_manager") notFound();
  return children;
}
