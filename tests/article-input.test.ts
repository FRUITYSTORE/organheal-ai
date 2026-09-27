import { describe, expect, it } from "vitest";

import {
  estimateReadMinutes,
  slugify,
  toBlogPost,
  validateArticleInput,
  type ArticleRow,
} from "../lib/articles/article";

const BODY = "This is a long enough article body to pass validation and be read by people.";

const valid = {
  title: "  Understanding   Iron  ",
  excerpt: "A short summary.",
  category: "Blood Health",
  content: BODY,
  labMarkers: "Ferritin, Hemoglobin, Ferritin",
  status: "published",
};

describe("article input", () => {
  it("cleans and accepts a valid article", () => {
    const result = validateArticleInput(valid);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.title).toBe("Understanding Iron");
      expect(result.value.labMarkers).toEqual(["Ferritin", "Hemoglobin"]);
      expect(result.value.status).toBe("published");
      expect(result.value.titleAr).toBeNull();
    }
  });

  it("defaults to draft and rejects missing pieces", () => {
    const draft = validateArticleInput({ ...valid, status: "whatever" });

    expect(draft.ok && draft.value.status).toBe("draft");
    expect(validateArticleInput({ ...valid, title: " " }).ok).toBe(false);
    expect(validateArticleInput({ ...valid, excerpt: "" }).ok).toBe(false);
    expect(validateArticleInput({ ...valid, category: "" }).ok).toBe(false);
    expect(validateArticleInput({ ...valid, content: "too short" }).ok).toBe(false);
    expect(validateArticleInput(null).ok).toBe(false);
  });

  it("keeps paragraph breaks in the body", () => {
    const result = validateArticleInput({
      ...valid,
      content: `${BODY}\r\n\r\n\r\n\r\nSecond paragraph here.`,
    });

    expect(result.ok && result.value.content).toContain("\n\nSecond paragraph");
    expect(result.ok && result.value.content).not.toContain("\n\n\n");
  });
});

describe("article slugs and blog mapping", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("Understanding Iron & Ferritin!")).toBe("understanding-iron-ferritin");
    expect(slugify("Café Crème")).toBe("cafe-creme");
    expect(slugify("فهم الحديد")).toBe("article");
    expect(slugify("Hi")).toBe("article");
  });

  it("estimates reading time", () => {
    expect(estimateReadMinutes("word ".repeat(400))).toBe(2);
    expect(estimateReadMinutes("one")).toBe(1);
  });

  it("maps a row to the blog shape with Arabic fallbacks", () => {
    const row: ArticleRow = {
      id: "1",
      slug: "understanding-iron",
      title: "Understanding Iron",
      title_ar: null,
      excerpt: "Summary",
      excerpt_ar: "ملخص",
      category: "Blood Health",
      category_ar: null,
      lab_markers: ["Ferritin"],
      content: BODY,
      content_ar: null,
      status: "published",
      reviewed_by: null,
      reviewed_at: null,
      sources: null,
      published_at: "2026-09-27T10:00:00Z",
      created_by: null,
      created_at: "2026-09-20T10:00:00Z",
      updated_at: "2026-09-27T10:00:00Z",
    };
    const post = toBlogPost(row);

    expect(post.date).toBe("2026-09-27");
    expect(post.titleAr).toBe("Understanding Iron");
    expect(post.excerptAr).toBe("ملخص");
    expect(post.contentAr).toBe(BODY);
    expect(post.readTime).toBe("1 min read");
    expect(post.readTimeAr).toContain("1");
    expect(post.labMarkers).toEqual(["Ferritin"]);
    expect(post.reviewedBy).toBeUndefined();
    expect(post.sources).toBeUndefined();
  });

  it("carries the reviewer and sources only when they were filled in", () => {
    const result = validateArticleInput({
      ...valid,
      reviewedBy: "  Jane Doe, RN  ",
      reviewedAt: "2026-09-20",
      sources: "WHO fact sheet\n\n  CDC guidance  \n",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.reviewedBy).toBe("Jane Doe, RN");
      expect(result.value.reviewedAt).toBe("2026-09-20");
      expect(result.value.sources).toBe("WHO fact sheet\nCDC guidance");

      const post = toBlogPost({
        id: "1",
        slug: "understanding-iron",
        title: "T",
        title_ar: null,
        excerpt: "E",
        excerpt_ar: null,
        category: "C",
        category_ar: null,
        lab_markers: [],
        content: BODY,
        content_ar: null,
        status: "published",
        reviewed_by: result.value.reviewedBy,
        reviewed_at: result.value.reviewedAt,
        sources: result.value.sources,
        published_at: "2026-09-27T10:00:00Z",
        created_by: null,
        created_at: "2026-09-20T10:00:00Z",
        updated_at: "2026-09-27T10:00:00Z",
      });

      expect(post.reviewedBy).toBe("Jane Doe, RN");
      expect(post.reviewedAt).toBe("2026-09-20");
      expect(post.sources).toEqual(["WHO fact sheet", "CDC guidance"]);
    }
  });

  it("ignores a malformed review date and empty sources", () => {
    const result = validateArticleInput({
      ...valid,
      reviewedBy: "Someone",
      reviewedAt: "20/09/2026",
      sources: " \n ",
    });

    expect(result.ok && result.value.reviewedAt).toBeNull();
    expect(result.ok && result.value.sources).toBeNull();
  });
});
