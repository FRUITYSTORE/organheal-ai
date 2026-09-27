import { describe, expect, it } from "vitest";

import { parseDraft } from "../lib/content/article-generation.client";
import { KNOWLEDGE_TOPICS, pickNextTopic } from "../lib/content/knowledge-topics";

const VALID_DRAFT_JSON = JSON.stringify({
  title: "Understanding Vitamin D",
  titleAr: "فهم فيتامين د",
  excerpt: "A short summary of what vitamin D results mean.",
  excerptAr: "ملخص قصير عن معنى نتائج فيتامين د.",
  content: "Paragraph one.\n\nParagraph two.",
  contentAr: "الفقرة الأولى.\n\nالفقرة الثانية.",
  sources: ["WHO fact sheet", "NIH Office of Dietary Supplements"],
});

describe("parseDraft", () => {
  it("parses a clean JSON response", () => {
    const draft = parseDraft(VALID_DRAFT_JSON);

    expect(draft.title).toBe("Understanding Vitamin D");
    expect(draft.titleAr).toBe("فهم فيتامين د");
    expect(draft.sources).toEqual(["WHO fact sheet", "NIH Office of Dietary Supplements"]);
  });

  it("strips a markdown code fence the model added anyway", () => {
    const fenced = "```json\n" + VALID_DRAFT_JSON + "\n```";

    expect(parseDraft(fenced).title).toBe("Understanding Vitamin D");
  });

  it("defaults sources to an empty list when missing or malformed", () => {
    const withoutSources = JSON.parse(VALID_DRAFT_JSON);

    delete withoutSources.sources;

    expect(parseDraft(JSON.stringify(withoutSources)).sources).toEqual([]);
  });

  it("rejects invalid JSON instead of silently returning junk", () => {
    expect(() => parseDraft("not json at all")).toThrow();
  });

  it("rejects a JSON object missing required fields", () => {
    const incomplete = JSON.parse(VALID_DRAFT_JSON);

    delete incomplete.contentAr;

    expect(() => parseDraft(JSON.stringify(incomplete))).toThrow();
  });
});

describe("pickNextTopic", () => {
  it("returns the first topic when nothing has been generated yet", () => {
    expect(pickNextTopic(new Set()).key).toBe(KNOWLEDGE_TOPICS[0].key);
  });

  it("skips topics that were already used", () => {
    const used = new Set([KNOWLEDGE_TOPICS[0].key, KNOWLEDGE_TOPICS[1].key]);

    expect(pickNextTopic(used).key).toBe(KNOWLEDGE_TOPICS[2].key);
  });

  it("wraps back to the first topic once every topic has been used", () => {
    const allUsed = new Set(KNOWLEDGE_TOPICS.map((topic) => topic.key));

    expect(pickNextTopic(allUsed).key).toBe(KNOWLEDGE_TOPICS[0].key);
  });

  it("has no duplicate topic keys", () => {
    const keys = KNOWLEDGE_TOPICS.map((topic) => topic.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
