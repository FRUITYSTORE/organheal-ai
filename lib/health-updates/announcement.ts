export const ANNOUNCEMENT_TONES = [
  "teal",
  "blue",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;

export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  title_ar: string | null;
  body_ar: string | null;
  link_url: string | null;
  tone: AnnouncementTone;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementInput = {
  title: string;
  body: string;
  titleAr: string | null;
  bodyAr: string | null;
  linkUrl: string | null;
  tone: AnnouncementTone;
  isActive: boolean;
  expiresAt: string | null;
};

export type PublicAnnouncement = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  tone: AnnouncementTone;
};

const LIMITS = { title: 120, body: 600 } as const;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const text = cleanText(value);
  return text ? text : null;
}

export type ValidationResult =
  | { ok: true; value: AnnouncementInput }
  | { ok: false; error: string };

export function validateAnnouncementInput(raw: unknown): ValidationResult {
  const source = (raw ?? {}) as Record<string, unknown>;

  const title = cleanText(source.title);
  const body = cleanText(source.body);
  const titleAr = optionalText(source.titleAr);
  const bodyAr = optionalText(source.bodyAr);

  if (!title || title.length > LIMITS.title) {
    return { ok: false, error: `Title is required (max ${LIMITS.title} characters).` };
  }

  if (!body || body.length > LIMITS.body) {
    return { ok: false, error: `Text is required (max ${LIMITS.body} characters).` };
  }

  if (titleAr && titleAr.length > LIMITS.title) {
    return { ok: false, error: `Arabic title is too long (max ${LIMITS.title} characters).` };
  }

  if (bodyAr && bodyAr.length > LIMITS.body) {
    return { ok: false, error: `Arabic text is too long (max ${LIMITS.body} characters).` };
  }

  const tone = source.tone;

  if (!ANNOUNCEMENT_TONES.includes(tone as AnnouncementTone)) {
    return { ok: false, error: "Choose one of the available colors." };
  }

  const linkUrl = optionalText(source.linkUrl);

  if (linkUrl) {
    let parsed: URL | null = null;

    try {
      parsed = new URL(linkUrl);
    } catch {
      parsed = null;
    }

    if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
      return { ok: false, error: "The link must start with http:// or https://." };
    }
  }

  const expiresRaw = optionalText(source.expiresAt);
  let expiresAt: string | null = null;

  if (expiresRaw) {
    const date = new Date(expiresRaw);

    if (Number.isNaN(date.getTime())) {
      return { ok: false, error: "The expiry date is not valid." };
    }

    expiresAt = date.toISOString();
  }

  return {
    ok: true,
    value: {
      title,
      body,
      titleAr,
      bodyAr,
      linkUrl,
      tone: tone as AnnouncementTone,
      isActive: source.isActive !== false,
      expiresAt,
    },
  };
}

export function toRowPayload(input: AnnouncementInput) {
  return {
    title: input.title,
    body: input.body,
    title_ar: input.titleAr,
    body_ar: input.bodyAr,
    link_url: input.linkUrl,
    tone: input.tone,
    is_active: input.isActive,
    expires_at: input.expiresAt,
  };
}

export function toPublicAnnouncement(
  row: AnnouncementRow,
  language: "en" | "ar"
): PublicAnnouncement {
  const useArabic = language === "ar";

  return {
    id: row.id,
    title: (useArabic ? row.title_ar : null) || row.title,
    body: (useArabic ? row.body_ar : null) || row.body,
    url: row.link_url,
    tone: row.tone,
  };
}
