/**
 * Role rules shared by pages, server actions and tests. Pure functions only:
 * the database (Row Level Security) remains the real guard, these give clear
 * error messages and decide what to show.
 */
export type Role = "admin" | "area_manager" | "bureau_manager" | "staff";

export type Membership = {
  role: Role;
  organisation_id: string | null;
  area_id: string | null;
  store_id: string | null;
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  area_manager: "Area manager",
  bureau_manager: "Bureau manager",
  staff: "Staff",
};

const RANK: Record<Role, number> = { admin: 4, area_manager: 3, bureau_manager: 2, staff: 1 };

export const roleRank = (role: Role) => RANK[role];

export function highestRole(memberships: Membership[]): Role | null {
  let best: Role | null = null;
  for (const m of memberships) if (!best || RANK[m.role] > RANK[best]) best = m.role;
  return best;
}

const has = (ms: Membership[], role: Role) => ms.some((m) => m.role === role);
export const isAdmin = (ms: Membership[]) => has(ms, "admin");

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export type NavItem = {
  href: string;
  label: string;
  icon: "overview" | "tags" | "structure" | "people" | "insights" | "audit";
  roles: Role[];
  /** Flip to true when the page exists, so no link ever leads to a 404. */
  built: boolean;
  /** Shorter wording for the cramped phone navigation bar. */
  short?: string;
};

const ALL: Role[] = ["admin", "area_manager", "bureau_manager", "staff"];

export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "overview", roles: ALL, built: true },
  { href: "/tags", label: "Tags", icon: "tags", roles: ["admin", "area_manager", "bureau_manager"], built: true },
  { href: "/structure", label: "Areas and stores", icon: "structure", roles: ["admin", "area_manager"], built: true, short: "Stores" },
  { href: "/people", label: "People", icon: "people", roles: ["admin", "area_manager", "bureau_manager"], built: true },
  { href: "/insights", label: "Insights", icon: "insights", roles: ALL, built: true },
  { href: "/audit", label: "Audit log", icon: "audit", roles: ["admin", "area_manager"], built: true, short: "Audit" },
];

export function navFor(memberships: Membership[]): NavItem[] {
  return NAV.filter((item) => item.built && item.roles.some((r) => has(memberships, r)));
}

// ---------------------------------------------------------------------------
// Who may grant what
// ---------------------------------------------------------------------------
export type GrantTarget = {
  role: Role;
  areaId?: string | null;
  storeId?: string | null;
  /** The area the target store sits in (looked up by the caller). */
  storeAreaId?: string | null;
};

export type Decision = { ok: true } | { ok: false; reason: string };
const no = (reason: string): Decision => ({ ok: false, reason });

/** Roles this person may hand out at all. Never their own level or higher, except admins. */
export function invitableRoles(ms: Membership[]): Role[] {
  if (isAdmin(ms)) return ["admin", "area_manager", "bureau_manager", "staff"];
  if (has(ms, "area_manager")) return ["bureau_manager", "staff"];
  if (has(ms, "bureau_manager")) return ["staff"];
  return [];
}

export function canGrant(inviter: Membership[], target: GrantTarget): Decision {
  if (!invitableRoles(inviter).includes(target.role)) {
    return no(`You can't give someone the ${ROLE_LABELS[target.role]} role.`);
  }
  if (isAdmin(inviter)) {
    if (target.role === "area_manager" && !target.areaId) return no("Choose an area.");
    if ((target.role === "bureau_manager" || target.role === "staff") && !target.storeId) return no("Choose a store.");
    return { ok: true };
  }
  if (target.role === "admin" || target.role === "area_manager") return no("Only an admin can do that.");
  if (!target.storeId) return no("Choose a store.");

  if (has(inviter, "area_manager")) {
    const mine = inviter.filter((m) => m.role === "area_manager").map((m) => m.area_id);
    if (target.storeAreaId && mine.includes(target.storeAreaId)) return { ok: true };
  }
  if (target.role === "staff" && has(inviter, "bureau_manager")) {
    if (inviter.some((m) => m.role === "bureau_manager" && m.store_id === target.storeId)) return { ok: true };
  }
  return no("That store is outside your area of responsibility.");
}

/** May the actor switch this person on or off? Same scope rule, strictly lower rank. */
export function canManageUser(
  actorId: string,
  actor: Membership[],
  targetId: string,
  target: Membership[],
  storeAreas: Record<string, string>,
): Decision {
  if (actorId === targetId) return no("You can't change your own access.");
  if (target.length === 0) return no("That person has no access to manage.");
  const actorTop = highestRole(actor);
  if (!actorTop || actorTop === "staff") return no("You can't manage people.");
  if (isAdmin(actor)) return { ok: true };

  const myAreas = actor.filter((m) => m.role === "area_manager").map((m) => m.area_id);
  const myStores = actor.filter((m) => m.role === "bureau_manager").map((m) => m.store_id);

  for (const m of target) {
    if (RANK[m.role] >= RANK[actorTop]) return no("You can only manage people at a lower level than you.");
    const inArea = (areaId: string | null) => areaId !== null && myAreas.includes(areaId);
    const storeArea = m.store_id ? storeAreas[m.store_id] ?? null : null;
    const inScope =
      (m.area_id && inArea(m.area_id)) ||
      (storeArea && inArea(storeArea)) ||
      (m.store_id && myStores.includes(m.store_id) && m.role === "staff");
    if (!inScope) return no("That person is outside your area of responsibility.");
  }
  return { ok: true };
}
