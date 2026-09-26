import { describe, expect, it } from "vitest";

import {
  toPublicAnnouncement,
  validateAnnouncementInput,
  type AnnouncementRow,
} from "@/lib/health-updates/announcement";

const valid = {
  title: "  Drink water  ",
  body: "Stay hydrated through the day.",
  tone: "blue",
};

describe("validateAnnouncementInput", () => {
  it("accepts a minimal announcement and trims text", () => {
    const result = validateAnnouncementInput(valid);

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Drink water",
        body: "Stay hydrated through the day.",
        titleAr: null,
        bodyAr: null,
        linkUrl: null,
        tone: "blue",
        isActive: true,
        expiresAt: null,
      },
    });
  });

  it("rejects missing title, missing text and unknown colors", () => {
    expect(validateAnnouncementInput({ ...valid, title: " " }).ok).toBe(false);
    expect(validateAnnouncementInput({ ...valid, body: "" }).ok).toBe(false);
    expect(validateAnnouncementInput({ ...valid, tone: "neon" }).ok).toBe(false);
    expect(validateAnnouncementInput(null).ok).toBe(false);
  });

  it("rejects over-long text", () => {
    expect(validateAnnouncementInput({ ...valid, title: "a".repeat(121) }).ok).toBe(false);
    expect(validateAnnouncementInput({ ...valid, body: "a".repeat(601) }).ok).toBe(false);
  });

  it("only allows http(s) links", () => {
    expect(validateAnnouncementInput({ ...valid, linkUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateAnnouncementInput({ ...valid, linkUrl: "not a url" }).ok).toBe(false);
    expect(validateAnnouncementInput({ ...valid, linkUrl: "https://who.int/x" }).ok).toBe(true);
  });

  it("normalises the expiry date and rejects invalid ones", () => {
    const ok = validateAnnouncementInput({ ...valid, expiresAt: "2030-01-01T10:00:00Z" });

    expect(ok.ok && ok.value.expiresAt).toBe("2030-01-01T10:00:00.000Z");
    expect(validateAnnouncementInput({ ...valid, expiresAt: "soon" }).ok).toBe(false);
  });
});

describe("toPublicAnnouncement", () => {
  const row: AnnouncementRow = {
    id: "id-1",
    title: "Hello",
    body: "World",
    title_ar: "مرحبا",
    body_ar: null,
    link_url: null,
    tone: "rose",
    is_active: true,
    expires_at: null,
    created_at: "",
    updated_at: "",
  };

  it("uses Arabic when available and falls back to English per field", () => {
    expect(toPublicAnnouncement(row, "ar")).toEqual({
      id: "id-1",
      title: "مرحبا",
      body: "World",
      url: null,
      tone: "rose",
    });
    expect(toPublicAnnouncement(row, "en").title).toBe("Hello");
  });
});
