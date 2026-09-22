import { describe, expect, it, vi } from "vitest";

import { fetchWhoUpdates, parseWhoFeed } from "@/lib/health-updates/who-feed";

const item = (title: string, link: string, date: string) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`;

describe("parseWhoFeed", () => {
  const now = new Date("2026-09-22T12:00:00Z");

  it("returns the newest health items first, without corporate news", () => {
    const xml = `<rss><channel>
      ${item("Older story", "https://www.who.int/news/item/a", "Mon, 07 Sep 2026 13:49:07 Z")}
      ${item("WHO Director-General visits Jordan", "https://www.who.int/news/item/b", "Fri, 18 Sep 2026 10:00:00 Z")}
      ${item("New guidance on hypertension &amp; salt", "https://www.who.int/news/item/c", "Sat, 19 Sep 2026 08:00:00 Z")}
    </channel></rss>`;

    expect(parseWhoFeed(xml, now)).toEqual([
      {
        title: "New guidance on hypertension & salt",
        url: "https://www.who.int/news/item/c",
        source: "WHO",
        publishedAt: "2026-09-19T08:00:00.000Z",
      },
      {
        title: "Older story",
        url: "https://www.who.int/news/item/a",
        source: "WHO",
        publishedAt: "2026-09-07T13:49:07.000Z",
      },
    ]);
  });

  it("rejects links that do not point at who.int, bad dates, future dates and duplicates", () => {
    const xml = `<rss><channel>
      ${item("Elsewhere", "https://example.com/x", "Sat, 19 Sep 2026 08:00:00 Z")}
      ${item("No date", "https://www.who.int/news/item/d", "not a date")}
      ${item("From the future", "https://www.who.int/news/item/e", "Sat, 19 Sep 2027 08:00:00 Z")}
      ${item("Real", "https://www.who.int/news/item/f", "Sat, 19 Sep 2026 08:00:00 Z")}
      ${item("Real again", "https://www.who.int/news/item/f", "Sat, 19 Sep 2026 09:00:00 Z")}
    </channel></rss>`;

    expect(parseWhoFeed(xml, now).map((entry) => entry.title)).toEqual(["Real"]);
  });

  it("reads Arabic headlines and keeps at most six", () => {
    const items = Array.from({ length: 9 }, (_, index) =>
      item(
        `تدشين مبادرة ${index}`,
        `https://www.who.int/ar/news/item/${index}`,
        `Mon, ${String(10 + index).padStart(2, "0")} Sep 2026 10:00:00 Z`
      )
    ).join("");

    const result = parseWhoFeed(`<rss><channel>${items}</channel></rss>`, now);

    expect(result).toHaveLength(6);
    expect(result[0].title).toBe("تدشين مبادرة 8");
  });

  it("truncates very long headlines", () => {
    const xml = `<rss><channel>${item("x".repeat(300), "https://www.who.int/n/1", "Mon, 07 Sep 2026 13:49:07 Z")}</channel></rss>`;

    expect(parseWhoFeed(xml, now)[0].title.length).toBeLessThanOrEqual(140);
  });
});

describe("fetchWhoUpdates", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const feed = (entries: string) => `<rss><channel>${entries}</channel></rss>`;

  it("merges the English feeds, drops stale items and sorts by date", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("feature-stories")
        ? new Response(
            feed(
              item("Fresh story", "https://www.who.int/news/item/1", "Wed, 16 Sep 2026 12:40:43 Z")
            )
          )
        : new Response(
            feed(
              item("Very old news", "https://www.who.int/news/item/2", "Wed, 23 Jul 2025 10:07:41 Z") +
                item("Recent news", "https://www.who.int/news/item/3", "Mon, 07 Sep 2026 13:49:07 Z")
            )
          )
    ) as unknown as typeof fetch;

    const result = await fetchWhoUpdates("en", fetcher, now);

    expect(result.map((entry) => entry.title)).toEqual([
      "Fresh story",
      "Recent news",
    ]);
  });

  it("keeps working when one feed fails and throws when all fail", async () => {
    const partial = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          feed(item("Still here", "https://www.who.int/news/item/4", "Mon, 07 Sep 2026 13:49:07 Z"))
        )
      ) as unknown as typeof fetch;

    await expect(fetchWhoUpdates("en", partial, now)).resolves.toHaveLength(1);

    const failing = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 500 })) as unknown as typeof fetch;

    await expect(fetchWhoUpdates("ar", failing, now)).rejects.toThrow();
  });
});
