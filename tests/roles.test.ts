import { describe, expect, it } from "vitest";
import { canGrant, canManageUser, invitableRoles, navFor, type Membership } from "@/lib/auth/roles";

const m = (role: Membership["role"], extra: Partial<Membership> = {}): Membership => ({
  role,
  organisation_id: role === "admin" ? "org" : null,
  area_id: null,
  store_id: null,
  ...extra,
});

const admin = [m("admin")];
const area1 = [m("area_manager", { area_id: "A1" })];
const wbManager = [m("bureau_manager", { store_id: "WB" })];
const staff = [m("staff", { store_id: "WB" })];

describe("invitable roles", () => {
  it("never reaches the inviter's own level, except for admins", () => {
    expect(invitableRoles(admin)).toContain("admin");
    expect(invitableRoles(area1)).toEqual(["bureau_manager", "staff"]);
    expect(invitableRoles(wbManager)).toEqual(["staff"]);
    expect(invitableRoles(staff)).toEqual([]);
  });
});

describe("canGrant", () => {
  it("lets admins grant anything with a scope", () => {
    expect(canGrant(admin, { role: "area_manager", areaId: "A2" }).ok).toBe(true);
    expect(canGrant(admin, { role: "staff", storeId: "BU" }).ok).toBe(true);
    expect(canGrant(admin, { role: "staff" }).ok).toBe(false);
  });
  it("keeps area managers inside their area and below their own role", () => {
    expect(canGrant(area1, { role: "bureau_manager", storeId: "WB", storeAreaId: "A1" }).ok).toBe(true);
    expect(canGrant(area1, { role: "staff", storeId: "MA", storeAreaId: "A2" }).ok).toBe(false);
    expect(canGrant(area1, { role: "area_manager", areaId: "A1" }).ok).toBe(false);
    expect(canGrant(area1, { role: "admin" }).ok).toBe(false);
  });
  it("lets bureau managers add staff to their own store only", () => {
    expect(canGrant(wbManager, { role: "staff", storeId: "WB", storeAreaId: "A1" }).ok).toBe(true);
    expect(canGrant(wbManager, { role: "staff", storeId: "BU", storeAreaId: "A1" }).ok).toBe(false);
    expect(canGrant(wbManager, { role: "bureau_manager", storeId: "WB" }).ok).toBe(false);
  });
  it("gives staff no powers", () => {
    expect(canGrant(staff, { role: "staff", storeId: "WB" }).ok).toBe(false);
  });
});

describe("canManageUser", () => {
  const storeAreas = { WB: "A1", BU: "A1", MA: "A2" };
  it("blocks self-changes", () => {
    expect(canManageUser("u1", admin, "u1", staff, storeAreas).ok).toBe(false);
  });
  it("lets an area manager manage lower roles in their area only", () => {
    expect(canManageUser("a", area1, "b", wbManager, storeAreas).ok).toBe(true);
    expect(canManageUser("a", area1, "c", [m("staff", { store_id: "MA" })], storeAreas).ok).toBe(false);
    expect(canManageUser("a", area1, "d", area1, storeAreas).ok).toBe(false);
    expect(canManageUser("a", area1, "e", admin, storeAreas).ok).toBe(false);
  });
  it("lets a bureau manager manage staff in their store but not peers", () => {
    expect(canManageUser("b", wbManager, "s", staff, storeAreas).ok).toBe(true);
    expect(canManageUser("b", wbManager, "s", [m("staff", { store_id: "BU" })], storeAreas).ok).toBe(false);
    expect(canManageUser("b", wbManager, "p", wbManager, storeAreas).ok).toBe(false);
  });
  it("gives staff no powers", () => {
    expect(canManageUser("s", staff, "t", staff, storeAreas).ok).toBe(false);
  });
});

describe("navigation", () => {
  const labels = (ms: Membership[]) => navFor(ms).map((n) => n.label);
  it("shows each role only the pages it may use", () => {
    expect(labels(staff)).toEqual(["Overview"]);
    expect(labels(wbManager)).toEqual(["Overview", "Tags", "People"]);
    expect(labels(area1)).toEqual(["Overview", "Tags", "Areas and stores", "People"]);
    expect(labels(admin)).toEqual(["Overview", "Tags", "Areas and stores", "People"]);
  });
});

import { safeNext, signOutTarget } from "@/lib/auth/redirects";

describe("redirect targets", () => {
  it("only ever follows same-site paths after sign-in", () => {
    expect(safeNext("/overview?range=7d&live=poll")).toBe("/overview?range=7d&live=poll");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined, 42]) {
      expect(safeNext(bad), String(bad)).toBe("/overview");
    }
  });
  it("sign-out lands on the home page or the sign-in page, nothing else", () => {
    expect(signOutTarget("/")).toBe("/");
    expect(signOutTarget("/login")).toBe("/login");
    for (const bad of ["https://evil.example", "//evil.example", "/overview", null, undefined]) {
      expect(signOutTarget(bad), String(bad)).toBe("/login");
    }
  });
});
