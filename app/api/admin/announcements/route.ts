import { NextResponse } from "next/server";

import { authorizeAdminApiRequest } from "@/lib/api/api-admin-auth";
import { validateAnnouncementInput } from "@/lib/health-updates/announcement";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAllAnnouncements,
  updateAnnouncement,
} from "@/lib/repositories/health-announcement.repository";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
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
    return NextResponse.json(
      { announcements: await listAllAnnouncements() },
      { headers: NO_STORE }
    );
  } catch {
    return fail("Unable to load announcements.", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const validation = validateAnnouncementInput(await readJson(request));

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    const announcement = await createAnnouncement(validation.value);

    return NextResponse.json({ announcement }, { status: 201, headers: NO_STORE });
  } catch {
    return fail("Unable to save the announcement.", 500);
  }
}

export async function PUT(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const body = await readJson(request);
  const id = (body as { id?: unknown } | null)?.id;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return fail("A valid announcement id is required.", 400);
  }

  const validation = validateAnnouncementInput(body);

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    const announcement = await updateAnnouncement(id, validation.value);

    if (!announcement) {
      return fail("Announcement not found.", 404);
    }

    return NextResponse.json({ announcement }, { headers: NO_STORE });
  } catch {
    return fail("Unable to save the announcement.", 500);
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !UUID_PATTERN.test(id)) {
    return fail("A valid announcement id is required.", 400);
  }

  try {
    await deleteAnnouncement(id);

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch {
    return fail("Unable to delete the announcement.", 500);
  }
}
