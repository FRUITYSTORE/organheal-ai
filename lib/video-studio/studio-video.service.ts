import "server-only";

import {
  EXPLAINER_DISCLAIMER,
  EXPLAINER_JSON_SCHEMA,
  buildExplainerInstructions,
  parseExplainerScript,
  type ExplainerScript,
} from "@/lib/health-videos/explainer";
import { synthesizeVoice } from "@/lib/voice/voice-synthesis.service";
import { findStockFootage } from "@/lib/video-studio/pexels-video.client";
import { uploadNarrationAudio } from "@/lib/video-studio/audio-storage";
import { buildStudioVideoEdit, type StudioScene } from "@/lib/video-studio/build-studio-video-edit";
import { submitShotstackRender, getShotstackRenderStatus } from "@/lib/video-studio/shotstack.client";
import {
  createStudioVideo,
  updateStudioVideo,
  type StudioVideoRow,
} from "@/lib/repositories/studio-video.repository";

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
async function generateExplainerScript(topic: string): Promise<ExplainerScript> {
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
        instructions: buildExplainerInstructions("en", "topic"),
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

// Best-effort per scene: a failed TTS call or footage lookup should not sink
// the whole render — the scene just plays with whatever it does have.
//
// Footage is searched by the video's own TOPIC, not the scene's generic
// heading ("What it is", "Why it matters", ...) — searching by heading alone
// pulled completely unrelated stock footage in the pilot's first real render
// (a skincare clip for an LDL cholesterol video). `sceneIndex` picks a
// different one of the topic's top matches per scene, for some visual
// variety across an otherwise-identical query.
async function resolveScene(
  topic: string,
  heading: string,
  narration: string,
  sceneIndex: number
): Promise<StudioScene> {
  const [audio, footage] = await Promise.all([
    synthesizeVoice({ text: narration, language: "en" }).catch(() => null),
    findStockFootage(topic, sceneIndex).catch(() => null),
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
  createdBy: string
): Promise<StudioVideoRow> {
  const record = await createStudioVideo({ topic, createdBy });

  try {
    const script = await generateExplainerScript(topic);
    const disclaimer = EXPLAINER_DISCLAIMER.en;
    const slides = [...script.slides, disclaimer];
    const scenes = await Promise.all(
      slides.map((slide, index) => resolveScene(topic, slide.heading, slide.narration, index))
    );
    const edit = buildStudioVideoEdit(script, scenes);
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
