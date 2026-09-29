import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";
import { createApiRequestId, logApiError, logApiInfo } from "@/lib/api/api-logger";
import { guardUsage } from "@/lib/billing/usage-guard";
import { REPORT_TEXT_LIMIT, normalizeExplainerLanguage } from "@/lib/health-videos/explainer";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculateHeartAge, type HeartAgeInput } from "@/lib/heart-age/heart-age.engine";
import { buildHeartStoryContext } from "@/lib/heart-age/heart-story-context";
import { startHeartStoryVideo } from "@/lib/video-studio/studio-video.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: string, status: number, requestId: string) {
  return NextResponse.json({ error, requestId }, { status, headers: { ...NO_STORE, "x-request-id": requestId } });
}

// Numbers are re-validated and re-clamped by calculateHeartAge() itself, but
// we still reject non-finite input outright here rather than letting NaN
// silently flow into it — the request body is untrusted input.
function parseHeartAgeInput(body: unknown): HeartAgeInput | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  const sex = raw.sex === "female" ? "female" : raw.sex === "male" ? "male" : null;

  const age = Number(raw.age);
  const totalCholesterol = Number(raw.totalCholesterol);
  const hdlCholesterol = Number(raw.hdlCholesterol);
  const systolicBloodPressure = Number(raw.systolicBloodPressure);

  if (
    !sex ||
    !Number.isFinite(age) ||
    !Number.isFinite(totalCholesterol) ||
    !Number.isFinite(hdlCholesterol) ||
    !Number.isFinite(systolicBloodPressure)
  ) {
    return null;
  }

  return {
    sex,
    age,
    totalCholesterol,
    hdlCholesterol,
    systolicBloodPressure,
    onBloodPressureMedication: raw.onBloodPressureMedication === true,
    isSmoker: raw.isSmoker === true,
    hasDiabetes: raw.hasDiabetes === true,
  };
}

// A real rendered video (footage + real narration audio + burned captions
// via Shotstack) telling the signed-in member's own personal heart story —
// "Layer 3" of the free Heart Age calculator. Shares the same studio_video
// usage limit as /api/studio-video/personal (same expensive render, same
// monthly allowance): free members get 1/month, Plus members 5/month.
//
// The heart age result is always recomputed server-side from the raw inputs
// (see calculateHeartAge) — a client-supplied heartAge/risk number is never
// trusted directly, so the story the video tells is always mathematically
// real.
export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const authentication = await authenticateApiRequest(request);

  if (!authentication.success) {
    return fail(authentication.error, authentication.status, requestId);
  }

  const { user, client } = authentication;

  let language: "en" | "ar" = "en";
  let heartAgeInput: HeartAgeInput | null = null;

  try {
    const body = (await request.json()) as { language?: unknown };

    language = normalizeExplainerLanguage(body.language);
    heartAgeInput = parseHeartAgeInput(body);
  } catch {
    language = "en";
  }

  if (!heartAgeInput) {
    return fail(
      language === "ar"
        ? "بيانات عمر القلب غير صحيحة. احسب عمر قلبك أولاً."
        : "Invalid heart age input. Calculate your heart age first.",
      400,
      requestId
    );
  }

  const heartAgeResult = calculateHeartAge(heartAgeInput);

  // A report is optional extra grounding, not a requirement — the calculator
  // itself is available to any signed-in member, with or without a report.
  const { data: reports } = await client
    .from("uploaded_lab_files")
    .select("extracted_text")
    .eq("user_id", user.id)
    .not("extracted_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const text = reports?.[0]?.extracted_text;
  const reportText = typeof text === "string" ? text.trim().slice(0, REPORT_TEXT_LIMIT) : "";

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
    const heartContext = buildHeartStoryContext(heartAgeInput, heartAgeResult, reportText);
    const video = await startHeartStoryVideo(user.id, heartContext, heartAgeInput, heartAgeResult, language);

    logApiInfo("studio_video_heart_story.started", { requestId, userId: user.id, videoId: video.id });

    return NextResponse.json({ video }, { status: 201, headers: { ...NO_STORE, "x-request-id": requestId } });
  } catch (error) {
    logApiError("studio_video_heart_story.failed", error, { requestId, userId: user.id });

    return fail(
      language === "ar"
        ? "تعذّر إنشاء الفيديو الآن. حاول مرة أخرى بعد قليل."
        : "We couldn't create the video just now. Please try again shortly.",
      502,
      requestId
    );
  }
}
