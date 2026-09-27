import { describe, expect, it } from "vitest";

import {
  STAFF_PERMISSIONS,
  getStaffPermissions,
  hasStaffPermission,
  isSiteAdmin,
  isStaffMember,
  normalizePermissions,
} from "../lib/staff-permissions";

const user = (metadata: Record<string, unknown> | undefined) => ({ app_metadata: metadata });

describe("staff permissions", () => {
  it("gives administrators every area", () => {
    const admin = user({ organheal_role: "admin" });

    expect(isSiteAdmin(admin)).toBe(true);
    expect(getStaffPermissions(admin)).toEqual([...STAFF_PERMISSIONS]);
    expect(hasStaffPermission(admin, "articles")).toBe(true);
  });

  it("limits a moderator to the areas an administrator ticked", () => {
    const moderator = user({
      organheal_role: "moderator",
      organheal_permissions: ["videos", "articles"],
    });

    expect(isSiteAdmin(moderator)).toBe(false);
    expect(getStaffPermissions(moderator)).toEqual(["videos", "articles"]);
    expect(hasStaffPermission(moderator, "videos")).toBe(true);
    expect(hasStaffPermission(moderator, "announcements")).toBe(false);
    expect(isStaffMember(moderator)).toBe(true);
  });

  it("ignores unknown or forged permissions", () => {
    expect(normalizePermissions(["videos", "reports", "everything", 7])).toEqual(["videos"]);
    expect(normalizePermissions("videos")).toEqual([]);
    expect(
      getStaffPermissions(user({ organheal_role: "moderator", organheal_permissions: ["reports"] }))
    ).toEqual([]);
  });

  it("gives ordinary members and visitors nothing", () => {
    expect(getStaffPermissions(user(undefined))).toEqual([]);
    expect(getStaffPermissions(user({ organheal_role: "member" }))).toEqual([]);
    // Permissions without the moderator role grant nothing.
    expect(getStaffPermissions(user({ organheal_permissions: ["videos"] }))).toEqual([]);
    expect(isStaffMember(null)).toBe(false);
    expect(isStaffMember(user({ organheal_role: "moderator" }))).toBe(false);
  });
});
