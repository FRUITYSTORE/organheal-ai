export type HealthUpdate = {
  title: string;
  url: string;
  source: "WHO";
  publishedAt: string;
};

// The English news feed stopped receiving new items early in 2026, so English
// also reads the feature stories, which WHO keeps current.
const WHO_FEEDS = {
  en: [
    "https://www.who.int/rss-feeds/feature-stories-english.xml",
    "https://www.who.int/rss-feeds/news-english.xml",
  ],
  ar: ["https://www.who.int/rss-feeds/news-arabic.xml"],
} as const;

const MAX_AGE_DAYS = 90;

// Corporate items (appointments, statements, tributes) are not health
// information a patient can use, so they stay out of the strip.
const CORPORATE_TITLE =
  /director-general|statement|tribute|appoint|withdrawal|funding|assembly|المدير العام|بيان|تعيين|تأبين|انسحاب|جمعية الصحة/i;

const MAX_ITEMS = 6;
const MAX_TITLE_LENGTH = 140;

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block: string, tag: string): string {
  const match = block.match(
    new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i")
  );

  return match ? decodeEntities(match[1]) : "";
}

function truncate(value: string): string {
  return value.length > MAX_TITLE_LENGTH
    ? `${value.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : value;
}

/**
 * Turns a WHO RSS document into the newest few health updates: headline,
 * link and date only, always pointing back to who.int.
 */
export function parseWhoFeed(xml: string, now: Date = new Date()): HealthUpdate[] {
  const items: HealthUpdate[] = [];
  const seen = new Set<string>();

  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = match[0];
    const title = readTag(block, "title");
    const url = readTag(block, "link");
    const published = new Date(readTag(block, "pubDate").replace(/ Z$/, " GMT"));

    if (
      !title ||
      !url.startsWith("https://www.who.int/") ||
      Number.isNaN(published.getTime()) ||
      published.getTime() > now.getTime() + 24 * 60 * 60 * 1000 ||
      CORPORATE_TITLE.test(title) ||
      seen.has(url)
    ) {
      continue;
    }

    seen.add(url);
    items.push({
      title: truncate(title),
      url,
      source: "WHO",
      publishedAt: published.toISOString(),
    });
  }

  return items
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_ITEMS);
}

async function fetchFeed(url: string, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(url, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`WHO feed responded ${response.status}`);
  }

  return response.text();
}

/**
 * The newest updates across the language's feeds. A feed that fails is
 * skipped; the call only fails when none of them could be read.
 */
export async function fetchWhoUpdates(
  language: "en" | "ar",
  fetcher: typeof fetch = fetch,
  now: Date = new Date()
): Promise<HealthUpdate[]> {
  const results = await Promise.allSettled(
    WHO_FEEDS[language].map((url) => fetchFeed(url, fetcher))
  );

  const documents = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  if (documents.length === 0) {
    throw new Error("No WHO feed could be read.");
  }

  const cutoff = now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();

  return documents
    .flatMap((xml) => parseWhoFeed(xml, now))
    .filter((item) => {
      if (seen.has(item.url) || new Date(item.publishedAt).getTime() < cutoff) {
        return false;
      }

      seen.add(item.url);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_ITEMS);
}
