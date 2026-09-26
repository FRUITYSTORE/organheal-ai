import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";
import {
  createApiRequestId,
  logApiError,
  logApiInfo,
} from "@/lib/api/api-logger";
import { guardUsage } from "@/lib/billing/usage-guard";
import {
  EXPLAINER_JSON_SCHEMA,
  buildExplainerInstructions,
  normalizeExplainerLanguage,
  parseExplainerScript,
  validateExplainerQuestion,
} from "@/lib/health-videos/explainer";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";
const TIMEOUT_MS = 25_000;
const NO_STORE = { "Cache-Control": "no-store" };

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
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return null;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const headers = { ...NO_STORE, "x-request-id": requestId };
  const body = (await readJson(request)) as {
    question?: unknown;
    language?: unknown;
  } | null;

  const language = normalizeExplainerLanguage(body?.language);
  const validation = validateExplainerQuestion(body?.question);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400, headers });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          language === "ar"
            ? "ميزة الشرح بالفيديو غير متاحة حالياً."
            : "The video explainer is not available right now.",
      },
      { status: 503, headers }
    );
  }

  // Signed-in members are counted per account, everyone else per network
  // address, so the daily allowance cannot be dodged by clearing cookies.
  const authentication = await authenticateApiRequest(request);
  const userId = authentication.success ? authentication.user.id : null;

  const denied = await guardUsage({
    client: getSupabaseAdminClient(),
    feature: "video_explainer",
    request,
    userId,
    language,
    requestId,
  });

  if (denied) {
    return denied;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_GENERAL_ASSISTANT_MODEL?.trim() || DEFAULT_MODEL,
        instructions: buildExplainerInstructions(language),
        input: `Health topic or question to explain: ${validation.question}`,
        text: {
          format: {
            type: "json_schema",
            name: "health_explainer",
            strict: true,
            schema: EXPLAINER_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Explainer provider returned status ${response.status}.`);
    }

    const text = extractText((await response.json()) as OpenAIResponsesResult);
    const script = text ? parseExplainerScript(JSON.parse(text)) : null;

    if (!script) {
      throw new Error("Explainer provider returned an unusable script.");
    }

    logApiInfo("video_explainer.generated", {
      requestId,
      slides: script.slides.length,
      language,
      member: Boolean(userId),
    });

    return NextResponse.json({ script, language }, { headers });
  } catch (error) {
    logApiError("video_explainer.failed", error, { requestId });

    return NextResponse.json(
      {
        error:
          language === "ar"
            ? "تعذّر إنشاء الشرح الآن. حاول مرة أخرى بعد قليل."
            : "We couldn't create the explainer just now. Please try again shortly.",
      },
      { status: 502, headers }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
