import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

/**
 * Turns a raw audit row into a plain sentence. Raw details are never shown: they hold
 * whole database rows, and a sentence is what a manager needs ("who changed what").
 */
export type AuditRow = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_id: string | null;
  occurred_at: string;
  details: unknown;
};

export type Category = "areas" | "cities" | "stores" | "tags" | "people";
export const CATEGORY_LABELS: Record<Category, string> = {
  areas: "Areas",
  cities: "Cities",
  stores: "Stores",
  tags: "Tags",
  people: "People",
};
export const CATEGORY_ENTITY: Record<Category, string> = {
  areas: "areas",
  cities: "cities",
  stores: "stores",
  tags: "tags",
  people: "profile",
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

export function categoryOf(entity: string): Category | null {
  return (Object.entries(CATEGORY_ENTITY).find(([, e]) => e === entity)?.[0] as Category | undefined) ?? null;
}

export function describeAudit(
  row: Pick<AuditRow, "action" | "entity" | "entity_id" | "details">,
  names: { stores: Map<string, string>; people: Map<string, string> },
): string {
  const d = obj(row.details);
  const before = obj(d.before);
  const after = obj(d.after);
  const name = str(after.name) ?? str(before.name);
  const label = str(after.label) ?? str(before.label);
  const store = (id: unknown) => (typeof id === "string" ? (names.stores.get(id) ?? "another store") : "another store");

  switch (row.action) {
    case "areas.insert":
      return `Added the area ${name ?? ""}`.trim();
    case "areas.update":
      if (before.name !== after.name) return `Renamed the area ${str(before.name)} to ${str(after.name)}`;
      if (before.is_active !== after.is_active) return `${after.is_active ? "Switched on" : "Switched off"} the area ${name}`;
      return `Edited the area ${name}`;
    case "cities.insert":
      return `Added the city ${name ?? ""}`.trim();
    case "cities.update":
      return before.name !== after.name ? `Renamed the city ${str(before.name)} to ${str(after.name)}` : `Edited the city ${name}`;
    case "stores.insert":
      return `Added the store ${name ?? ""}`.trim();
    case "stores.update":
      if (before.name !== after.name) return `Renamed the store ${str(before.name)} to ${str(after.name)}`;
      if (before.is_active !== after.is_active) return `${after.is_active ? "Switched on" : "Switched off"} the store ${name}`;
      if (before.google_review_url !== after.google_review_url || before.google_place_id !== after.google_place_id)
        return `Changed the Google link for ${name}`;
      return `Edited the store ${name}`;
    case "tags.insert":
      return `Created the tag “${label}” at ${store(after.store_id)}`;
    case "tag.renamed":
      return `Renamed the tag “${str(before.label)}” to “${str(after.label)}”`;
    case "tag.moved":
      return `Moved the tag “${label}” from ${store(before.store_id)} to ${store(after.store_id)}`;
    case "tag.activated":
      return `Switched on the tag “${label}”`;
    case "tag.deactivated":
      return `Switched off the tag “${label}”`;
    case "tag.retired":
      return `Retired the tag “${label}” (permanent)`;
    case "tag.updated":
      return `Edited the tag “${label}”`;
    case "user.invited": {
      const role = str(d.role) as Role | undefined;
      return `Invited ${str(d.email) ?? "someone"} as ${role && role in ROLE_LABELS ? ROLE_LABELS[role] : "a user"}`;
    }
    case "user.deactivated":
    case "user.reactivated": {
      const who = (row.entity_id && names.people.get(row.entity_id)) || "a person";
      return `${row.action === "user.deactivated" ? "Switched off" : "Switched back on"} the login for ${who}`;
    }
    default:
      return `Changed ${row.entity}`;
  }
}
