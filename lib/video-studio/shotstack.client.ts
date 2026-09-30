// Thin client for Shotstack's Edit API (https://shotstack.io) — the managed
// rendering service the video studio composites real footage, narration
// audio and burned captions through, instead of running a headless browser
// renderer ourselves (see lib/video-studio/studio-video.service.ts for why).
export type ShotstackEnvironment = "sandbox" | "production";

const RENDER_SUBMIT_TIMEOUT_MS = 15_000;
const RENDER_STATUS_TIMEOUT_MS = 10_000;

function getEnvironment(): ShotstackEnvironment {
  return process.env.SHOTSTACK_ENVIRONMENT?.trim() === "production" ? "production" : "sandbox";
}

// Shotstack's path is https://api.shotstack.io/edit/{v1|stage}/render — the
// environment segment comes AFTER "edit", not before it.
function getBaseUrl(): string {
  return getEnvironment() === "production"
    ? "https://api.shotstack.io/edit/v1"
    : "https://api.shotstack.io/edit/stage";
}

function getApiKey(): string {
  const apiKey = process.env.SHOTSTACK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("SHOTSTACK_API_KEY is not configured.");
  }

  return apiKey;
}

// A minimal, hand-written slice of the Edit API's schema — only the fields
// build-studio-video-edit.ts actually produces. Shotstack's real schema has
// many more optional fields; add them here if a future template needs them.
export type ShotstackClip = {
  asset:
    | { type: "video"; src: string; volume?: number }
    | { type: "audio"; src: string; volume?: number }
    | {
        type: "text";
        text: string;
        font?: { family?: string; size?: number; color?: string; lineHeight?: number };
        background?: { color?: string; opacity?: number; padding?: number };
      }
    // Newer HTML asset (distinct from the older, HTML4/CSS2-only "html" type):
    // supports real CSS @keyframes/transitions, so this is what we use to
    // render our own owned, data-driven motion graphics (see
    // heart-hero-scene.ts) server-side through Shotstack — no third-party
    // avatar API, no separate rendering infrastructure of our own.
    | { type: "html5"; html: string; css?: string; width: number; height: number; background?: string };
  start: number;
  length: number;
  fit?: "cover" | "contain" | "crop";
  position?: "top" | "center" | "bottom";
  transition?: { in?: string; out?: string };
};

export type ShotstackEdit = {
  timeline: {
    soundtrack?: { src: string; volume?: number };
    background?: string;
    // Font files a text asset's font.family can then name — how a font that
    // isn't built into Shotstack (e.g. Arabic Cairo) gets into a render.
    fonts?: Array<{ src: string }>;
    tracks: Array<{ clips: ShotstackClip[] }>;
  };
  output: {
    format: "mp4";
    size: { width: number; height: number };
    fps?: number;
  };
};

export type ShotstackRenderStatus =
  | "queued"
  | "fetching"
  | "rendering"
  | "saving"
  | "done"
  | "failed";

export type ShotstackRenderResult = {
  id: string;
  status: ShotstackRenderStatus;
  url: string | null;
  error: string | null;
};

async function shotstackFetch(path: string, init: RequestInit, timeoutMs: number) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        "x-api-key": getApiKey(),
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: abortController.signal,
    });
    const body = (await response.json()) as {
      success?: boolean;
      message?: string;
      response?: { id?: unknown; status?: unknown; url?: unknown; error?: unknown };
    };

    if (!response.ok || body.success === false) {
      throw new Error(body.message || `Shotstack returned status ${response.status}.`);
    }

    return body.response ?? {};
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function submitShotstackRender(edit: ShotstackEdit): Promise<string> {
  const response = await shotstackFetch(
    "/render",
    { method: "POST", body: JSON.stringify(edit) },
    RENDER_SUBMIT_TIMEOUT_MS
  );
  const id = (response as { id?: unknown }).id;

  if (typeof id !== "string" || !id) {
    throw new Error("Shotstack did not return a render id.");
  }

  return id;
}

export async function getShotstackRenderStatus(id: string): Promise<ShotstackRenderResult> {
  const response = await shotstackFetch(`/render/${encodeURIComponent(id)}`, { method: "GET" }, RENDER_STATUS_TIMEOUT_MS);
  const data = response as { id?: unknown; status?: unknown; url?: unknown; error?: unknown };
  const status: ShotstackRenderStatus =
    data.status === "done" ||
    data.status === "failed" ||
    data.status === "rendering" ||
    data.status === "saving" ||
    data.status === "fetching"
      ? data.status
      : "queued";

  return {
    id,
    status,
    url: typeof data.url === "string" ? data.url : null,
    error: typeof data.error === "string" ? data.error : null,
  };
}
