import "server-only";

import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  hasStaffPermission,
  type StaffPermission,
} from "@/lib/staff-permissions";

export const ORGANHEAL_ADMIN_ROLE =
  "admin" as const;

export type AuthorizedAdminApiSession = {
  success: true;

  token: string;

  user: User;

  client: SupabaseClient;
};

export type AdminApiAuthorizationFailure = {
  success: false;

  status:
    | 401
    | 403
    | 500;

  error: string;
};

export type AdminApiAuthorizationResult =
  | AuthorizedAdminApiSession
  | AdminApiAuthorizationFailure;

export function hasOrganHealAdminRole(
  user: Pick<
    User,
    "app_metadata"
  >
): boolean {
  return (
    user
      .app_metadata
      ?.organheal_role ===
    ORGANHEAL_ADMIN_ROLE
  );
}

export async function authorizeAdminApiRequest(
  request: Request
): Promise<AdminApiAuthorizationResult> {
  const authentication =
    await authenticateApiRequest(
      request
    );

  if (!authentication.success) {
    return authentication;
  }

  if (
    !hasOrganHealAdminRole(
      authentication.user
    )
  ) {
    return {
      success: false,

      status: 403,

      error:
        "Administrator access is required.",
    };
  }

  return authentication;
}

// Allows an administrator, or a moderator who has been given this specific
// permission by an administrator.
export async function authorizeStaffApiRequest(
  request: Request,
  permission: StaffPermission
): Promise<AdminApiAuthorizationResult> {
  const authentication = await authenticateApiRequest(request);

  if (!authentication.success) {
    return authentication;
  }

  if (!hasStaffPermission(authentication.user, permission)) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to manage this area.",
    };
  }

  return authentication;
}
