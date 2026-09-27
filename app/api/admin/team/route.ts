import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  ORGANHEAL_ADMIN_ROLE,
  authorizeAdminApiRequest,
  hasOrganHealAdminRole,
} from "@/lib/api/api-admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "no-store" };
const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

function toMember(user: User) {
  return { id: user.id, email: user.email ?? "", createdAt: user.created_at };
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

export async function GET(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  try {
    const admins = await findUsers((user) => hasOrganHealAdminRole(user));

    return NextResponse.json(
      { admins: admins.map(toMember), currentUserId: authorization.user.id },
      { headers: NO_STORE }
    );
  } catch {
    return fail("Unable to load the team.", 500);
  }
}

// Grants administrator access to an existing account by email.
export async function POST(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const raw = (await readJson(request)) as { email?: unknown } | null;
  const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return fail("Enter a valid email address.", 400);
  }

  try {
    const [user] = await findUsers((candidate) => candidate.email?.toLowerCase() === email);

    if (!user) {
      return fail(
        "No account uses this email. Ask them to sign up first, then add them here.",
        404
      );
    }

    if (hasOrganHealAdminRole(user)) {
      return NextResponse.json({ member: toMember(user), alreadyAdmin: true }, { headers: NO_STORE });
    }

    const { data, error } = await getSupabaseAdminClient().auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, organheal_role: ORGANHEAL_ADMIN_ROLE },
    });

    if (error || !data.user) {
      return fail("Unable to grant access.", 500);
    }

    return NextResponse.json({ member: toMember(data.user) }, { status: 201, headers: NO_STORE });
  } catch {
    return fail("Unable to grant access.", 500);
  }
}

// Removes administrator access. You cannot remove your own, so the site is
// never left without an administrator by accident.
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
    return fail("You cannot remove your own administrator access.", 400);
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: existing, error: lookupError } = await admin.auth.admin.getUserById(id);

    if (lookupError || !existing.user) {
      return fail("User not found.", 404);
    }

    const { error } = await admin.auth.admin.updateUserById(id, {
      app_metadata: { ...existing.user.app_metadata, organheal_role: null },
    });

    if (error) {
      return fail("Unable to remove access.", 500);
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch {
    return fail("Unable to remove access.", 500);
  }
}
