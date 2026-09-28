// Real stock-footage lookup for the video studio pilot (see
// lib/video-studio/studio-video.service.ts). Distinct from
// lib/content/article-image.client.ts, which searches Pexels PHOTOS for
// article cover images — this searches Pexels VIDEOS for short clips to use
// as a scene's background footage.
const PEXELS_VIDEO_SEARCH_URL = "https://api.pexels.com/videos/search";
const FOOTAGE_LOOKUP_TIMEOUT_MS = 10_000;

// Landscape HD is what the render's output size expects; avoid vertical or
// tiny files.
const MIN_WIDTH = 1000;

export type StockFootageClip = {
  url: string;
  durationSeconds: number;
};

type PexelsVideoFile = {
  link?: unknown;
  width?: unknown;
  height?: unknown;
  quality?: unknown;
};

type PexelsVideoSearchResult = {
  videos?: Array<{
    duration?: unknown;
    video_files?: PexelsVideoFile[];
  }>;
};

function pickBestFile(files: PexelsVideoFile[]): string | null {
  const landscapeHd = files.find(
    (file) =>
      typeof file.link === "string" &&
      typeof file.width === "number" &&
      file.width >= MIN_WIDTH &&
      typeof file.height === "number" &&
      file.width > file.height
  );

  if (landscapeHd && typeof landscapeHd.link === "string") {
    return landscapeHd.link;
  }

  const anyMp4 = files.find((file) => typeof file.link === "string");

  return typeof anyMp4?.link === "string" ? anyMp4.link : null;
}

// Best-effort: a missing key, network failure, or no results all resolve to
// null rather than throwing, so the caller can fall back to a plain
// background instead of failing the whole render.
export async function findStockFootage(
  searchQuery: string
): Promise<StockFootageClip | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FOOTAGE_LOOKUP_TIMEOUT_MS);

  try {
    const url = `${PEXELS_VIDEO_SEARCH_URL}?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as PexelsVideoSearchResult;
    const video = result.videos?.[0];
    const link = video ? pickBestFile(video.video_files ?? []) : null;

    if (!video || !link) {
      return null;
    }

    const duration = typeof video.duration === "number" && video.duration > 0 ? video.duration : 8;

    return { url: link, durationSeconds: duration };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
