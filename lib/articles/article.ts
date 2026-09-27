import type { BlogPost } from "@/lib/blogData";

export type ArticleStatus = "draft" | "published";
export type ArticleSource = "staff" | "ai";

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  excerpt: string;
  excerpt_ar: string | null;
  category: string;
  category_ar: string | null;
  lab_markers: string[];
  content: string;
  content_ar: string | null;
  status: ArticleStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sources: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Present once the source/cover-image migration has been applied; absent
  // (undefined) on a database that has not run it yet.
  source?: ArticleSource;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  cover_image_alt_ar?: string | null;
  topic_key?: string | null;
};

export type ArticleInput = {
  title: string;
  titleAr: string | null;
  excerpt: string;
  excerptAr: string | null;
  category: string;
  categoryAr: string | null;
  labMarkers: string[];
  content: string;
  contentAr: string | null;
  status: ArticleStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  sources: string | null;
  source: ArticleSource;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  coverImageAltAr: string | null;
  topicKey: string | null;
};

export const ARTICLE_LIMITS = {
  title: 140,
  excerpt: 300,
  category: 60,
  content: 20000,
  labMarkers: 12,
  labMarker: 40,
  reviewedBy: 120,
  sources: 2000,
  coverImageUrl: 600,
  coverImageAlt: 200,
  topicKey: 80,
} as const;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// Keeps paragraph breaks (the reader splits on blank lines) but normalises
// line endings and trims stray whitespace.
function cleanBody(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, ARTICLE_LIMITS.content)
    : "";
}

// One source per line; blank lines dropped.
function cleanSources(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n").slice(0, ARTICLE_LIMITS.sources) : null;
}

function validDate(value: unknown): string | null {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

// Only accept a plain https image URL — never javascript:, data:, or other
// schemes a stored card could otherwise render.
function validImageUrl(value: unknown): string | null {
  const trimmed = clean(value, ARTICLE_LIMITS.coverImageUrl);

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function validateArticleInput(
  body: unknown
): { ok: true; value: ArticleInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const title = clean(raw.title, ARTICLE_LIMITS.title);
  const excerpt = clean(raw.excerpt, ARTICLE_LIMITS.excerpt);
  const category = clean(raw.category, ARTICLE_LIMITS.category);
  const content = cleanBody(raw.content);

  if (!title) return { ok: false, error: "A title is required." };
  if (!excerpt) return { ok: false, error: "A short summary is required." };
  if (!category) return { ok: false, error: "A category is required." };
  if (content.length < 40) {
    return { ok: false, error: "The article body is too short." };
  }

  const markers = (
    Array.isArray(raw.labMarkers)
      ? raw.labMarkers
      : typeof raw.labMarkers === "string"
        ? raw.labMarkers.split(",")
        : []
  )
    .map((marker) => clean(marker, ARTICLE_LIMITS.labMarker))
    .filter(Boolean)
    .slice(0, ARTICLE_LIMITS.labMarkers);

  return {
    ok: true,
    value: {
      title,
      titleAr: clean(raw.titleAr, ARTICLE_LIMITS.title) || null,
      excerpt,
      excerptAr: clean(raw.excerptAr, ARTICLE_LIMITS.excerpt) || null,
      category,
      categoryAr: clean(raw.categoryAr, ARTICLE_LIMITS.category) || null,
      labMarkers: [...new Set(markers)],
      content,
      contentAr: cleanBody(raw.contentAr) || null,
      status: raw.status === "published" ? "published" : "draft",
      reviewedBy: clean(raw.reviewedBy, ARTICLE_LIMITS.reviewedBy) || null,
      reviewedAt: validDate(raw.reviewedAt),
      sources: cleanSources(raw.sources),
      source: raw.source === "ai" ? "ai" : "staff",
      coverImageUrl: validImageUrl(raw.coverImageUrl),
      coverImageAlt: clean(raw.coverImageAlt, ARTICLE_LIMITS.coverImageAlt) || null,
      coverImageAltAr: clean(raw.coverImageAltAr, ARTICLE_LIMITS.coverImageAlt) || null,
      topicKey: clean(raw.topicKey, ARTICLE_LIMITS.topicKey) || null,
    },
  };
}

// A URL-safe slug from the English title. Falls back to "article" when the
// title has no Latin letters or digits.
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug.length >= 3 ? slug : "article";
}

export function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}

function arabicMinutes(minutes: number): string {
  return `قراءة ${minutes} ${minutes >= 3 && minutes <= 10 ? "دقائق" : "دقيقة"}`;
}

// Maps a stored article onto the shape the blog pages already render, so a
// new article looks exactly like a built-in one. Missing Arabic fields fall
// back to the English text rather than showing blanks.
export function toBlogPost(row: ArticleRow): BlogPost {
  const minutes = estimateReadMinutes(row.content);

  return {
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar || row.title,
    excerpt: row.excerpt,
    excerptAr: row.excerpt_ar || row.excerpt,
    category: row.category,
    categoryAr: row.category_ar || row.category,
    date: (row.published_at ?? row.created_at).slice(0, 10),
    readTime: `${minutes} min read`,
    readTimeAr: arabicMinutes(minutes),
    organSystem: row.category,
    organSystemAr: row.category_ar || row.category,
    labMarkers: row.lab_markers ?? [],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: row.content,
    contentAr: row.content_ar || row.content,
    ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.reviewed_by && row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    ...(row.sources ? { sources: row.sources.split("\n").filter(Boolean) } : {}),
    ...(row.cover_image_url ? { coverImageUrl: row.cover_image_url } : {}),
    ...(row.cover_image_alt ? { coverImageAlt: row.cover_image_alt } : {}),
    ...(row.cover_image_alt_ar ? { coverImageAltAr: row.cover_image_alt_ar } : {}),
  };
}
