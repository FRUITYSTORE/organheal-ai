import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { authorizeAdminApiRequest } from "@/lib/api/api-admin-auth";
import {
  getStaffPermissions,
  isSiteAdmin,
  normalizePermissions,
  type StaffPermission,
} from "@/lib/staff-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Only administrators can reach this route. It is the single place where
// staff roles are granted, so a moderator can never promote anyone.
const NO_STORE = { "Cache-Control": "no-store" };
const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StaffRole = "admin" | "moderator";

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

function roleOf(user: User): StaffRole | null {
  const role = user.app_metadata?.organheal_role;

  return role === "admin" || role === "moderator" ? role : null;
}

function toMember(user: User) {
  const role = roleOf(user);

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    permissions: role === "admin" ? [] : getStaffPermissions(user),
    createdAt: user.created_at,
  };
}

// Walks the auth users a page at a time (capped) and keeps those matching.
async function findUsers(match: (user: User) => boolean): Promise<User[]> {
  const admin = getSupabaseAdminClient();
  const found: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error("Unable to load users.");
    }

    found.push(...data.users.filter(match));

    if (data.users.length < PAGE_SIZE) {
      break;
    }
  }

  return found;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseRoleInput(
  body: unknown
): { ok: true; role: StaffRole; permissions: StaffPermission[] } | { ok: false; error: string } {
  const raw = (body ?? {}) as { role?: unknown; permissions?: unknown };

  if (raw.role !== "admin" && raw.role !== "moderator") {
    return { ok: false, error: "Choose a role: administrator or moderator." };
  }

  const permissions = normalizePermissions(raw.permissions);

  if (raw.role === "moderator" && permissions.length === 0) {
    return { ok: false, error: "Choose at least one area for the moderator." };
  }

  return { ok: true, role: raw.role, permissions };
}

async function applyRole(
  user: User,
  role: StaffRole | null,
  permissions: StaffPermission[]
) {
  return getSupabaseAdminClient().auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      organheal_role: role,
      // Administrators need no list; removing access clears it too.
      organheal_permissions: role === "moderator" ? permissions : null,
    },
  });
}

export async function GET(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  try {
    const staff = await findUsers((user) => roleOf(user) !== null);

    return NextResponse.json(
      { staff: staff.map(toMember), currentUserId: authorization.user.id },
      { headers: NO_STORE }
    );
  } catch {
    return fail("Unable to load the team.", 500);
  }
}

// Gives an existing account a role by email.
export async function POST(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const body = await readJson(request);
  const email =
    typeof (body as { email?: unknown } | null)?.email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!EMAIL_PATTERN.test(email)) {
    return fail("Enter a valid email address.", 400);
  }

  const parsed = parseRoleInput(body);

  if (!parsed.ok) {
    return fail(parsed.error, 400);
  }

  try {
    const [user] = await findUsers((candidate) => candidate.email?.toLowerCase() === email);

    if (!user) {
      return fail(
        "No account uses this email. Ask them to sign up first, then add them here.",
        404
      );
    }

    const { data, error } = await applyRole(user, parsed.role, parsed.permissions);

    if (error || !data.user) {
      return fail("Unable to save access.", 500);
    }

    return NextResponse.json({ member: toMember(data.user) }, { status: 201, headers: NO_STORE });
  } catch {
    return fail("Unable to save access.", 500);
  }
}

// Changes an existing team member's role or areas. Your own role cannot be
// changed here, so the site is never left without an administrator by accident.
export async function PUT(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const body = await readJson(request);
  const id = (body as { id?: unknown } | null)?.id;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return fail("A valid user id is required.", 400);
  }

  if (id === authorization.user.id) {
    return fail("You cannot change your own access.", 400);
  }

  const parsed = parseRoleInput(body);

  if (!parsed.ok) {
    return fail(parsed.error, 400);
  }

  try {
    const { data: existing, error: lookupError } =
      await getSupabaseAdminClient().auth.admin.getUserById(id);

    if (lookupError || !existing.user) {
      return fail("User not found.", 404);
    }

    const { data, error } = await applyRole(existing.user, parsed.role, parsed.permissions);

    if (error || !data.user) {
      return fail("Unable to save access.", 500);
    }

    return NextResponse.json({ member: toMember(data.user) }, { headers: NO_STORE });
  } catch {
    return fail("Unable to save access.", 500);
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !UUID_PATTERN.test(id)) {
    return fail("A valid user id is required.", 400);
  }

  if (id === authorization.user.id) {
    return fail("You cannot remove your own access.", 400);
  }

  try {
    const { data: existing, error: lookupError } =
      await getSupabaseAdminClient().auth.admin.getUserById(id);

    if (lookupError || !existing.user) {
      return fail("User not found.", 404);
    }

    if (!isSiteAdmin(existing.user) && roleOf(existing.user) === null) {
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }

    const { error } = await applyRole(existing.user, null, []);

    if (error) {
      return fail("Unable to remove access.", 500);
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch {
    return fail("Unable to remove access.", 500);
  }
}
