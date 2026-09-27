// Who may manage what. Safe to import from both server and browser code:
// it only reads a user's `app_metadata`, which only the service role can set.
//
//   organheal_role = "admin"      -> everything, including the team screen
//   organheal_role = "moderator"  -> only the areas listed in
//                                    organheal_permissions
//
// Uploaded lab reports are deliberately NOT a delegable permission: they are
// members' private health data, so that screen stays administrator-only.

export const STAFF_PERMISSIONS = ["announcements", "videos", "articles"] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const STAFF_PERMISSION_LABELS: Record<
  StaffPermission,
  { en: string; ar: string }
> = {
  announcements: {
    en: "Homepage health notes",
    ar: "ملاحظات الصفحة الرئيسية الصحية",
  },
  videos: { en: "Health videos", ar: "الفيديوهات الصحية" },
  articles: { en: "Articles", ar: "المقالات" },
};

type MetadataHolder = { app_metadata?: Record<string, unknown> | null };

export function isStaffPermission(value: unknown): value is StaffPermission {
  return (
    typeof value === "string" &&
    (STAFF_PERMISSIONS as readonly string[]).includes(value)
  );
}

export function normalizePermissions(value: unknown): StaffPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return STAFF_PERMISSIONS.filter((permission) => value.includes(permission));
}

export function isSiteAdmin(user: MetadataHolder | null | undefined): boolean {
  return user?.app_metadata?.organheal_role === "admin";
}

export function getStaffPermissions(
  user: MetadataHolder | null | undefined
): StaffPermission[] {
  if (isSiteAdmin(user)) {
    return [...STAFF_PERMISSIONS];
  }

  if (user?.app_metadata?.organheal_role === "moderator") {
    return normalizePermissions(user.app_metadata.organheal_permissions);
  }

  return [];
}

export function hasStaffPermission(
  user: MetadataHolder | null | undefined,
  permission: StaffPermission
): boolean {
  return getStaffPermissions(user).includes(permission);
}

// True for an administrator, or a moderator with at least one permission.
export function isStaffMember(user: MetadataHolder | null | undefined): boolean {
  return isSiteAdmin(user) || getStaffPermissions(user).length > 0;
}
