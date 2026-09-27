import { NextResponse } from "next/server";

import { authorizeAdminApiRequest } from "@/lib/api/api-admin-auth";
import { validateVideoInput } from "@/lib/health-videos/custom";
import {
  createVideo,
  deleteVideo,
  listAllVideos,
  updateVideo,
} from "@/lib/repositories/health-video.repository";

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

function saveFailure(error: unknown) {
  return error instanceof Error && error.message === "duplicate"
    ? fail("This video has already been added.", 409)
    : fail("Unable to save the video.", 500);
}

export async function GET(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  try {
    return NextResponse.json({ videos: await listAllVideos() }, { headers: NO_STORE });
  } catch {
    return fail("Unable to load videos. Has the health_videos migration been applied?", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const validation = validateVideoInput(await readJson(request));

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    return NextResponse.json(
      { video: await createVideo(validation.value) },
      { status: 201, headers: NO_STORE }
    );
  } catch (error) {
    return saveFailure(error);
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
    return fail("A valid video id is required.", 400);
  }

  const validation = validateVideoInput(body);

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    const video = await updateVideo(id, validation.value);

    return video
      ? NextResponse.json({ video }, { headers: NO_STORE })
      : fail("Video not found.", 404);
  } catch (error) {
    return saveFailure(error);
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !UUID_PATTERN.test(id)) {
    return fail("A valid video id is required.", 400);
  }

  try {
    await deleteVideo(id);

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch {
    return fail("Unable to delete the video.", 500);
  }
}
