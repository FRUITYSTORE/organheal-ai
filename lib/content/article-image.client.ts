// Optional cover-photo lookup for AI-generated articles. Entirely opt-in:
// with no PEXELS_API_KEY configured this returns null immediately and the
// article simply publishes without a cover image (the existing, already
// safe behaviour) — never blocks or fails article generation over a photo.
const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const IMAGE_LOOKUP_TIMEOUT_MS = 8_000;

export type CoverImageResult = {
  url: string;
  // A generic, content-based description — Pexels does not require visible
  // photographer credit for this kind of use, so this is written as
  // accessibility alt text, not attribution.
  alt: string;
};

type PexelsSearchResult = {
  photos?: Array<{
    src?: { landscape?: unknown; large?: unknown };
    alt?: unknown;
  }>;
};

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export async function findCoverImage(
  imageQuery: string,
  fallbackAlt: string
): Promise<CoverImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), IMAGE_LOOKUP_TIMEOUT_MS);

  try {
    const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(imageQuery)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as PexelsSearchResult;
    const photo = result.photos?.[0];
    const imageUrl = firstString(photo?.src?.landscape, photo?.src?.large);

    if (!photo || !imageUrl) {
      return null;
    }

    return {
      url: imageUrl,
      alt: firstString(photo.alt) || fallbackAlt,
    };
  } catch {
    // Network error, timeout, or bad JSON — the article still publishes
    // without an image, which is strictly better than failing the job.
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
