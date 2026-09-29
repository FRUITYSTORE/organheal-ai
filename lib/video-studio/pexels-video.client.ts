// Real stock-footage lookup for the video studio pilot (see
// lib/video-studio/studio-video.service.ts). Distinct from
// lib/content/article-image.client.ts, which searches Pexels PHOTOS for
// article cover images — this searches Pexels VIDEOS for short clips to use
// as a scene's background footage.
const PEXELS_VIDEO_SEARCH_URL = "https://api.pexels.com/videos/search";
const PEXELS_VIDEO_BY_ID_URL = "https://api.pexels.com/videos/videos";
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

type PexelsVideo = {
  duration?: unknown;
  video_files?: PexelsVideoFile[];
};

type PexelsVideoSearchResult = {
  videos?: PexelsVideo[];
};

export function pickBestFile(files: PexelsVideoFile[]): string | null {
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
const RESULTS_PER_QUERY = 6;

// `resultIndex` (e.g. a scene's position in the video) picks a different one
// of the top matches for the same query, so consecutive scenes about the
// same topic do not all reuse the identical clip.
export async function findStockFootage(
  searchQuery: string,
  resultIndex = 0
): Promise<StockFootageClip | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FOOTAGE_LOOKUP_TIMEOUT_MS);

  try {
    const url = `${PEXELS_VIDEO_SEARCH_URL}?query=${encodeURIComponent(searchQuery)}&per_page=${RESULTS_PER_QUERY}&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as PexelsVideoSearchResult;
    const videos = result.videos ?? [];

    if (videos.length === 0) {
      return null;
    }

    const video = videos[resultIndex % videos.length];
    const link = pickBestFile(video.video_files ?? []);

    if (!link) {
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

// Fetches ONE specific, already-known Pexels video by id — used for the
// hand-reviewed curated footage lists (see curated-heart-footage.ts) instead
// of a live keyword search. A live search can return anything that happens
// to rank for the query (confirmed in production: a skincare-cream close-up
// for an "LDL cholesterol" video), which is unacceptable for a health topic.
// Curating by id means every clip that ever appears was actually watched and
// picked for relevance before shipping. Same best-effort/null-on-any-failure
// contract as findStockFootage, so a since-removed or now-portrait-only
// curated id degrades gracefully instead of breaking the render.
export async function getStockFootageById(videoId: number): Promise<StockFootageClip | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FOOTAGE_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(`${PEXELS_VIDEO_BY_ID_URL}/${videoId}`, {
      headers: { Authorization: apiKey },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const video = (await response.json()) as PexelsVideo;
    const link = pickBestFile(video.video_files ?? []);

    if (!link) {
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
