import { NextResponse } from "next/server";

import { authorizeAdminApiRequest } from "@/lib/api/api-admin-auth";
import { listRecentStudioVideos } from "@/lib/repositories/studio-video.repository";
import { startStudioVideoPilot, syncStudioVideoStatus } from "@/lib/video-studio/studio-video.service";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_TOPIC_LENGTH = 200;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

// Admin-only (not delegable to moderators yet — this is an experimental,
// real-cost pilot the owner should control directly; see
// lib/staff-permissions.ts).
export async function GET(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  try {
    const rows = await listRecentStudioVideos();
    const synced = await Promise.all(rows.map((row) => syncStudioVideoStatus(row)));

    return NextResponse.json({ videos: synced }, { headers: NO_STORE });
  } catch {
    return fail("Unable to load studio videos. Has the studio_videos migration been applied?", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApiRequest(request);

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  let topic = "";
  let language: "en" | "ar" = "en";

  try {
    const body = (await request.json()) as { topic?: unknown; language?: unknown };

    topic = typeof body.topic === "string" ? body.topic.trim().slice(0, MAX_TOPIC_LENGTH) : "";
    language = body.language === "ar" ? "ar" : "en";
  } catch {
    topic = "";
  }

  if (!topic) {
    return fail("A topic is required.", 400);
  }

  try {
    const video = await startStudioVideoPilot(topic, authorization.user.id, language);

    return NextResponse.json({ video }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to start the render.", 502);
  }
}
