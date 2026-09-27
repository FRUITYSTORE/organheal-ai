import {
  VIDEO_TOPICS,
  type HealthVideo,
  type VideoTopicKey,
} from "./catalog";

export type VideoRow = {
  id: string;
  youtube_id: string;
  topic: VideoTopicKey;
  title: string;
  title_ar: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VideoInput = {
  youtubeId: string;
  topic: VideoTopicKey;
  title: string;
  titleAr: string | null;
  source: string;
  isActive: boolean;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Accepts a bare 11-character id or any common YouTube link
// (watch?v=, youtu.be/, /embed/, /shorts/) and returns the id.
export function parseYouTubeId(value: string): string | null {
  const input = value.trim();

  if (YOUTUBE_ID.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let candidate: string | null = null;

    if (host === "youtu.be") {
      candidate = url.pathname.split("/")[1] ?? null;
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      candidate =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
        null;
    }

    return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function validateVideoInput(
  body: unknown
): { ok: true; value: VideoInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const youtubeId = parseYouTubeId(typeof raw.youtube === "string" ? raw.youtube : "");

  if (!youtubeId) {
    return { ok: false, error: "Enter a valid YouTube link or video id." };
  }

  const topic = VIDEO_TOPICS.find((entry) => entry.key === raw.topic)?.key;

  if (!topic) {
    return { ok: false, error: "Choose a topic." };
  }

  const title = text(raw.title, 140);
  const source = text(raw.source, 120);

  if (!title) {
    return { ok: false, error: "A title is required." };
  }

  if (!source) {
    return {
      ok: false,
      error: "Name the organisation that published the video.",
    };
  }

  return {
    ok: true,
    value: {
      youtubeId,
      topic,
      title,
      titleAr: text(raw.titleAr, 140) || null,
      source,
      isActive: raw.isActive !== false,
    },
  };
}

export function toRowPayload(input: VideoInput) {
  return {
    youtube_id: input.youtubeId,
    topic: input.topic,
    title: input.title,
    title_ar: input.titleAr,
    source: input.source,
    is_active: input.isActive,
  };
}

export function toPublicVideo(row: VideoRow): HealthVideo {
  return {
    youtubeId: row.youtube_id,
    topic: row.topic,
    title: { en: row.title, ar: row.title_ar || row.title },
    source: row.source,
  };
}
