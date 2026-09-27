import type { KnowledgeTopic } from "@/lib/content/knowledge-topics";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

// The more capable clinical-reasoning model already used elsewhere in this
// codebase for focused clinical explanations (see
// lib/health-intelligence/application/assistant-clinical-explanation) — a
// published article deserves the same care as a one-off explanation.
const DEFAULT_ARTICLE_MODEL = "gpt-5.6-terra";
const ARTICLE_GENERATION_TIMEOUT_MS = 45_000;

export type GeneratedArticleDraft = {
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  content: string;
  contentAr: string;
  sources: string[];
};

type OpenAIResponsesResult = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
};

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return apiKey;
}

function getArticleModel(): string {
  return process.env.OPENAI_ARTICLE_GENERATION_MODEL?.trim() || DEFAULT_ARTICLE_MODEL;
}

function extractResponseText(result: OpenAIResponsesResult): string | null {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  for (const outputItem of result.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string" &&
        contentItem.text.trim()
      ) {
        return contentItem.text.trim();
      }
    }
  }

  return null;
}

// The model is asked for strict JSON but sometimes wraps it in a markdown
// code fence anyway — strip that before parsing rather than failing the job.
function stripCodeFence(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced ? fenced[1] : text;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Exported so parsing/validation of the model's raw text can be unit-tested
// directly, without mocking fetch.
export function parseDraft(rawText: string): GeneratedArticleDraft {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    throw new Error("Article generation model did not return valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Article generation model returned an unexpected shape.");
  }

  const raw = parsed as Record<string, unknown>;
  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter(isNonEmptyString)
    : [];

  if (
    !isNonEmptyString(raw.title) ||
    !isNonEmptyString(raw.titleAr) ||
    !isNonEmptyString(raw.excerpt) ||
    !isNonEmptyString(raw.excerptAr) ||
    !isNonEmptyString(raw.content) ||
    !isNonEmptyString(raw.contentAr)
  ) {
    throw new Error("Article generation model left required fields empty.");
  }

  return {
    title: raw.title,
    titleAr: raw.titleAr,
    excerpt: raw.excerpt,
    excerptAr: raw.excerptAr,
    content: raw.content,
    contentAr: raw.contentAr,
    sources,
  };
}

function buildInstructions(): string {
  return [
    "You are a medical writer for OrganHeal AI's patient-education knowledge hub.",
    "Write a single educational article in both English and Arabic on the exact topic given.",
    "Audience: general adult readers with no medical background, in patient-friendly language.",
    "Tone: warm, clear, evidence-based, professional — never alarming.",
    "",
    "Hard rules:",
    "- Educational information only. Never diagnose, never recommend a specific medicine, dose, or brand.",
    "- Never claim to know anything about a specific reader's own results.",
    "- When you state a fact that comes from a named health authority (e.g. WHO, NIH, Mayo Clinic, CDC, NHS), list that source by name in \"sources\"; do not fabricate a source you are not confident about.",
    "- Arabic text must be natural Modern Standard Arabic, not a literal translation — write it as its own paragraph, not word-for-word from English.",
    "- Body length: roughly 350–600 words per language, in short paragraphs separated by a single blank line.",
    "- excerpt/excerptAr: one plain sentence, under 200 characters, no clickbait.",
    "",
    "Respond with ONLY a single JSON object (no markdown fence, no commentary) with exactly these keys:",
    '{"title": string, "titleAr": string, "excerpt": string, "excerptAr": string, "content": string, "contentAr": string, "sources": string[]}',
  ].join("\n");
}

export async function generateArticleDraft(
  topic: KnowledgeTopic
): Promise<GeneratedArticleDraft> {
  const apiKey = getOpenAIApiKey();
  const model = getArticleModel();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), ARTICLE_GENERATION_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model,
        instructions: buildInstructions(),
        input: `Topic: ${topic.topic}\nCategory: ${topic.category}\nRelated lab markers (if any): ${topic.labMarkers.join(", ") || "none"}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Article generation provider returned status ${response.status}.`);
    }

    const result = (await response.json()) as OpenAIResponsesResult;
    const text = extractResponseText(result);

    if (!text) {
      throw new Error("Article generation provider returned an empty response.");
    }

    return parseDraft(text);
  } finally {
    clearTimeout(timeoutId);
  }
}
