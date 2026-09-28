import "server-only";

import {
  EXPLAINER_DISCLAIMER,
  EXPLAINER_JSON_SCHEMA,
  buildExplainerInstructions,
  parseExplainerScript,
  type ExplainerLanguage,
  type ExplainerScript,
} from "@/lib/health-videos/explainer";
import { synthesizeVoice } from "@/lib/voice/voice-synthesis.service";
import { findStockFootage } from "@/lib/video-studio/pexels-video.client";
import { uploadNarrationAudio } from "@/lib/video-studio/audio-storage";
import {
  buildStudioVideoEdit,
  pickFootageQueryForScene,
  type StudioScene,
} from "@/lib/video-studio/build-studio-video-edit";
import { submitShotstackRender, getShotstackRenderStatus } from "@/lib/video-studio/shotstack.client";
import {
  createStudioVideo,
  updateStudioVideo,
  type StudioVideoRow,
} from "@/lib/repositories/studio-video.repository";
import { getMedicalReportMarkersForPatient } from "@/lib/repositories/report-markers.repository";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const SCRIPT_MODEL = "gpt-5.6-luna";
const SCRIPT_TIMEOUT_MS = 25_000;

type OpenAIResponsesResult = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
};

function extractText(result: OpenAIResponsesResult): string | null {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  for (const item of result.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

// Reuses the exact same instructions/schema the free video-explainer
// slideshow already uses (lib/health-videos/explainer.ts) — a script written
// for that feature is equally valid input for a real rendered video; only
// what happens with it afterward (Shotstack render vs. browser slideshow)
// differs.
async function generateExplainerScript(
  topic: string,
  language: ExplainerLanguage
): Promise<ExplainerScript> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), SCRIPT_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        model: SCRIPT_MODEL,
        instructions: buildExplainerInstructions(language, "topic"),
        input: `Health topic or question to explain: ${topic}`,
        text: {
          format: { type: "json_schema", name: "health_explainer", strict: true, schema: EXPLAINER_JSON_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Script provider returned status ${response.status}.`);
    }

    const text = extractText((await response.json()) as OpenAIResponsesResult);
    const script = text ? parseExplainerScript(JSON.parse(text)) : null;

    if (!script) {
      throw new Error("Script provider returned an unusable script.");
    }

    return script;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Same model call as above, but using the free video-explainer's REPORT mode
// instructions (lib/health-videos/explainer.ts's REPORT_MODE_RULES): the
// script is grounded only in values/units/ranges actually printed in the
// member's own report, never invented, never a diagnosis — same safety rule
// the existing free slideshow already enforces for "explain my report".
async function generatePersonalExplainerScript(
  reportText: string,
  language: ExplainerLanguage
): Promise<ExplainerScript> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), SCRIPT_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        model: SCRIPT_MODEL,
        instructions: buildExplainerInstructions(language, "report"),
        input: ["Viewer's focus (optional): (none)", "Lab report text:", '"""', reportText, '"""'].join("\n"),
        text: {
          format: { type: "json_schema", name: "health_explainer", strict: true, schema: EXPLAINER_JSON_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Script provider returned status ${response.status}.`);
    }

    const text = extractText((await response.json()) as OpenAIResponsesResult);
    const script = text ? parseExplainerScript(JSON.parse(text)) : null;

    if (!script) {
      throw new Error("Script provider returned an unusable script.");
    }

    return script;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Best-effort per scene: a failed TTS call or footage lookup should not sink
// the whole render — the scene just plays with whatever it does have.
//
// Footage is searched by an explicit query the caller picks — never the
// scene's own generic heading ("What it is", "Why it matters", ...), which
// pulled completely unrelated stock footage in the pilot's first real
// render (a skincare clip for an LDL cholesterol video). For an admin
// topic-driven video that query is the topic itself; for a member's
// personal video (see startPersonalStudioVideo) it's one of their own
// report's actual marker names instead, so the footage tracks whatever is
// really in their report rather than a fixed topic or organ list.
// `sceneIndex` picks a different one of that query's top matches per scene,
// for some visual variety.
async function resolveScene(
  footageQuery: string,
  heading: string,
  narration: string,
  sceneIndex: number,
  language: ExplainerLanguage
): Promise<StudioScene> {
  const [audio, footage] = await Promise.all([
    synthesizeVoice({ text: narration, language }).catch(() => null),
    // Stock footage is searched in English regardless of narration language
    // — visual content isn't language-dependent, and stock libraries are
    // indexed in English, so translating the query would only hurt matches.
    findStockFootage(footageQuery, sceneIndex).catch(() => null),
  ]);

  const audioUrl = audio
    ? await uploadNarrationAudio(audio.audio, `${Date.now()}.mp3`).catch(() => null)
    : null;

  return {
    heading,
    narration,
    footageUrl: footage?.url ?? null,
    audioUrl,
  };
}

// Starts one pilot render end to end (script -> per-scene audio/footage ->
// Shotstack submit) and records it. Intentionally admin-triggered only for
// now (see app/api/admin/studio-video/route.ts) — nothing here is wired to
// member-facing usage limits yet.
export async function startStudioVideoPilot(
  topic: string,
  createdBy: string,
  language: ExplainerLanguage = "en"
): Promise<StudioVideoRow> {
  const record = await createStudioVideo({ topic, createdBy });

  try {
    const script = await generateExplainerScript(topic, language);
    const disclaimer = EXPLAINER_DISCLAIMER[language];
    const slides = [...script.slides, disclaimer];
    const scenes = await Promise.all(
      slides.map((slide, index) => resolveScene(topic, slide.heading, slide.narration, index, language))
    );
    const edit = buildStudioVideoEdit(script, scenes, language);
    const renderId = await submitShotstackRender(edit);

    await updateStudioVideo(record.id, {
      title: script.title,
      status: "queued",
      shotstack_render_id: renderId,
    });

    return { ...record, title: script.title, shotstack_render_id: renderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while starting the render.";

    await updateStudioVideo(record.id, { status: "failed", error_message: message });

    throw error;
  }
}

// Starts a real rendered video for the SIGNED-IN MEMBER's own latest report
// — the personalized counterpart to startStudioVideoPilot's admin-typed
// topic. Callers must already have (a) confirmed the member is signed in,
// (b) loaded their reportText, and (c) checked the studio_video usage limit
// themselves (see app/api/studio-video/personal/route.ts for all three) —
// this function only does the generation and render.
export async function startPersonalStudioVideo(
  userId: string,
  reportText: string,
  language: ExplainerLanguage = "en"
): Promise<StudioVideoRow> {
  // Topic is a generic label, not the member's actual results — nothing
  // health-specific is ever stored outside the render itself, which only
  // this member's own admin-visible row (created_by = userId) can be tied to.
  const record = await createStudioVideo({ topic: "Personal report explainer", createdBy: userId });

  try {
    const [script, markerRows] = await Promise.all([
      generatePersonalExplainerScript(reportText, language),
      getMedicalReportMarkersForPatient(userId).catch(() => []),
    ]);

    // The member's own distinct marker names, most recent first — cycled
    // per scene below (pickFootageQueryForScene) so footage tracks whatever
    // is actually in their report, never a fixed organ list.
    const markerNames = [...new Set(markerRows.map((row) => row.marker_name))];
    const disclaimer = EXPLAINER_DISCLAIMER[language];
    const slides = [...script.slides, disclaimer];
    const scenes = await Promise.all(
      slides.map((slide, index) =>
        resolveScene(pickFootageQueryForScene(markerNames, index), slide.heading, slide.narration, index, language)
      )
    );
    const edit = buildStudioVideoEdit(script, scenes, language);
    const renderId = await submitShotstackRender(edit);

    await updateStudioVideo(record.id, {
      title: script.title,
      status: "queued",
      shotstack_render_id: renderId,
    });

    return { ...record, title: script.title, shotstack_render_id: renderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while starting the render.";

    await updateStudioVideo(record.id, { status: "failed", error_message: message });

    throw error;
  }
}

// Polls Shotstack for any studio video still in progress and writes back
// whatever changed — called from the admin GET route each time the page
// loads rather than on a schedule, since this is a low-volume manual pilot.
export async function syncStudioVideoStatus(row: StudioVideoRow): Promise<StudioVideoRow> {
  if (!row.shotstack_render_id || row.status === "done" || row.status === "failed") {
    return row;
  }

  try {
    const result = await getShotstackRenderStatus(row.shotstack_render_id);

    await updateStudioVideo(row.id, {
      status: result.status,
      output_url: result.url,
      error_message: result.error,
    });

    return { ...row, status: result.status, output_url: result.url, error_message: result.error };
  } catch {
    // A transient status-check failure is not a render failure — leave the
    // row as it was and try again next time the page loads.
    return row;
  }
}
