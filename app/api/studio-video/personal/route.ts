import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";
import { createApiRequestId, logApiError, logApiInfo } from "@/lib/api/api-logger";
import { guardUsage } from "@/lib/billing/usage-guard";
import { REPORT_TEXT_LIMIT, normalizeExplainerLanguage } from "@/lib/health-videos/explainer";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  listStudioVideosForUser,
  type StudioVideoRow,
} from "@/lib/repositories/studio-video.repository";
import { startPersonalStudioVideo, syncStudioVideoStatus } from "@/lib/video-studio/studio-video.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: string, status: number, requestId: string) {
  return NextResponse.json({ error, requestId }, { status, headers: { ...NO_STORE, "x-request-id": requestId } });
}

// A real rendered video (footage + narration + captions) built ONLY from the
// signed-in member's own uploaded report — the personal counterpart to the
// admin-only pilot at /api/admin/studio-video. Gated by the studio_video
// usage limit (lib/billing/usage-limits.ts): free members get 1/month, Plus
// members 5/month, since every render has a real cost.
export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const authentication = await authenticateApiRequest(request);

  if (!authentication.success) {
    return fail(authentication.error, authentication.status, requestId);
  }

  const { user, client } = authentication;

  let language: "en" | "ar" = "en";

  try {
    const body = (await request.json()) as { language?: unknown };

    language = normalizeExplainerLanguage(body.language);
  } catch {
    language = "en";
  }

  const { data: reports } = await client
    .from("uploaded_lab_files")
    .select("extracted_text")
    .eq("user_id", user.id)
    .not("extracted_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const text = reports?.[0]?.extracted_text;
  const reportText = typeof text === "string" ? text.trim().slice(0, REPORT_TEXT_LIMIT) : "";

  if (!reportText) {
    return fail(
      language === "ar"
        ? "لا يوجد تقرير مقروء بعد. ارفع تقرير تحليل أولاً."
        : "There is no readable report yet. Upload a lab report first.",
      404,
      requestId
    );
  }

  const denied = await guardUsage({
    client: getSupabaseAdminClient(),
    feature: "studio_video",
    request,
    userId: user.id,
    language,
    requestId,
  });

  if (denied) {
    return denied;
  }

  try {
    const video = await startPersonalStudioVideo(user.id, reportText, language);

    logApiInfo("studio_video_personal.started", { requestId, userId: user.id, videoId: video.id });

    return NextResponse.json({ video }, { status: 201, headers: { ...NO_STORE, "x-request-id": requestId } });
  } catch (error) {
    logApiError("studio_video_personal.failed", error, { requestId, userId: user.id });

    return fail(
      language === "ar"
        ? "تعذّر إنشاء الفيديو الآن. حاول مرة أخرى بعد قليل."
        : "We couldn't create the video just now. Please try again shortly.",
      502,
      requestId
    );
  }
}

// Lists the caller's own personal videos (never anyone else's), refreshing
// the status of any still in progress.
export async function GET(request: Request) {
  const requestId = createApiRequestId();
  const authentication = await authenticateApiRequest(request);

  if (!authentication.success) {
    return fail(authentication.error, authentication.status, requestId);
  }

  try {
    const rows = await listStudioVideosForUser(authentication.user.id);
    const synced: StudioVideoRow[] = await Promise.all(rows.map((row) => syncStudioVideoStatus(row)));

    return NextResponse.json({ videos: synced }, { headers: { ...NO_STORE, "x-request-id": requestId } });
  } catch (error) {
    logApiError("studio_video_personal.list_failed", error, { requestId, userId: authentication.user.id });

    return fail("Unable to load your videos.", 500, requestId);
  }
}
