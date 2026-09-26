"use client";

import { useEffect, useState } from "react";

import "./health-updates-strip.css";

type HealthUpdate = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

type FallbackSource = {
  source: string;
  href: string;
  labelEn: string;
  labelAr: string;
};

// Shown when the live feed cannot be reached, so the strip never sits empty.
const FALLBACK_SOURCES: FallbackSource[] = [
  {
    source: "WHO",
    href: "https://www.who.int/news-room/fact-sheets",
    labelEn: "Fact sheets on the health topics that matter most",
    labelAr: "صحائف وقائع عن أهم المواضيع الصحية",
  },
  {
    source: "NIH",
    href: "https://newsinhealth.nih.gov/",
    labelEn: "Consumer health guidance from the U.S. National Institutes of Health",
    labelAr: "إرشادات صحية للمستهلك من المعاهد الوطنية للصحة في أمريكا",
  },
  {
    source: "CDC",
    href: "https://www.cdc.gov/",
    labelEn: "Prevention and public health information from the CDC",
    labelAr: "معلومات الوقاية والصحة العامة من مراكز CDC",
  },
];

type Announcement = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  tone: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: HealthUpdate[]; featured: Announcement[] }
  | { status: "fallback"; featured: Announcement[] };

const VISIBLE_ITEMS = 3;

// Owner announcements come first; WHO news fills the remaining slots but
// never disappears entirely.
function newsSlots(featuredCount: number): number {
  return Math.max(1, VISIBLE_ITEMS - featuredCount);
}

function FeaturedCard({
  item,
  isArabic,
}: {
  item: Announcement;
  isArabic: boolean;
}) {
  const content = (
    <>
      <span className="ohUpdateMeta">
        <span className="ohUpdateSource">
          {isArabic ? "من OrganHeal" : "OrganHeal note"}
        </span>
      </span>

      <span className="ohUpdateHeadline ohUpdateFeaturedTitle" dir="auto">
        {item.title}
      </span>

      <span className="ohUpdateFeaturedBody" dir="auto">
        {item.body}
      </span>

      {item.url && (
        <span className="ohUpdateRead" aria-hidden="true">
          {isArabic ? "اعرف المزيد ↖" : "Learn more ↗"}
        </span>
      )}
    </>
  );

  return item.url ? (
    <a
      className="ohUpdateCard ohUpdateFeatured"
      data-tone={item.tone}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <div className="ohUpdateCard ohUpdateFeatured" data-tone={item.tone}>
      {content}
    </div>
  );
}

function formatAge(publishedAt: string, isArabic: boolean): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000)
  );

  if (days === 0) {
    return isArabic ? "اليوم" : "Today";
  }

  if (days < 14) {
    return new Intl.RelativeTimeFormat(isArabic ? "ar" : "en", {
      numeric: "always",
    }).format(-days, "day");
  }

  return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(publishedAt));
}

export default function HealthUpdatesStrip({
  isArabic,
}: {
  isArabic: boolean;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const language = isArabic ? "ar" : "en";

  useEffect(() => {
    const controller = new AbortController();

    const loadJson = <T,>(url: string): Promise<T | null> =>
      fetch(url, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") {
            throw error;
          }

          return null;
        });

    Promise.all([
      loadJson<{ items?: HealthUpdate[] }>(`/api/health-updates?lang=${language}`),
      loadJson<{ items?: Announcement[] }>(
        `/api/health-announcements?lang=${language}`
      ),
    ])
      .then(([news, announcements]) => {
        const items = news?.items ?? [];
        const featured = (announcements?.items ?? []).slice(0, 3);
        const slots = newsSlots(featured.length);

        setState(
          items.length >= VISIBLE_ITEMS
            ? { status: "ready", items: items.slice(0, slots), featured }
            : { status: "fallback", featured }
        );
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          setState({ status: "fallback", featured: [] });
        }
      });

    return () => controller.abort();
  }, [language]);

  const isLive = state.status === "ready";

  return (
    <section
      className="ohUpdates"
      aria-label={isArabic ? "أحدث المعلومات الصحية" : "Latest health updates"}
    >
      <header className="ohUpdatesHeader">
        <div className="ohUpdatesHeading">
          <span className="ohUpdatesPulse" aria-hidden="true" />
          <h2 className="ohUpdatesTitle">
            {isArabic ? "أحدث المعلومات الصحية" : "Health updates"}
          </h2>
        </div>

        <p className="ohUpdatesNote">
          {isLive
            ? isArabic
              ? "من منظمة الصحة العالمية · تتحدّث تلقائيًا"
              : "From the World Health Organization · refreshed automatically"
            : isArabic
              ? "مصادر صحية موثوقة"
              : "Trusted health sources"}
        </p>
      </header>

      <ul className="ohUpdatesList" aria-busy={state.status === "loading"}>
        {state.status === "loading" &&
          Array.from({ length: VISIBLE_ITEMS }, (_, index) => (
            <li className="ohUpdateCard ohUpdateSkeleton" key={index} aria-hidden="true">
              <span />
              <span />
              <span />
            </li>
          ))}

        {state.status !== "loading" &&
          state.featured.map((item) => (
            <li key={item.id}>
              <FeaturedCard item={item} isArabic={isArabic} />
            </li>
          ))}

        {state.status === "ready" &&
          state.items.map((item) => (
            <li key={item.url}>
              <a
                className="ohUpdateCard"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="ohUpdateMeta">
                  <span className="ohUpdateSource">{item.source}</span>
                  <time dateTime={item.publishedAt}>
                    {formatAge(item.publishedAt, isArabic)}
                  </time>
                </span>

                <span className="ohUpdateHeadline" dir="auto">
                  {item.title}
                </span>

                <span className="ohUpdateRead" aria-hidden="true">
                  {isArabic ? "اقرأ المصدر ↖" : "Read at source ↗"}
                </span>
              </a>
            </li>
          ))}

        {state.status === "fallback" &&
          FALLBACK_SOURCES.slice(0, newsSlots(state.featured.length)).map((item) => (
            <li key={item.source}>
              <a
                className="ohUpdateCard"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="ohUpdateMeta">
                  <span className="ohUpdateSource">{item.source}</span>
                </span>

                <span className="ohUpdateHeadline">
                  {isArabic ? item.labelAr : item.labelEn}
                </span>

                <span className="ohUpdateRead" aria-hidden="true">
                  {isArabic ? "زيارة المصدر ↖" : "Visit source ↗"}
                </span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  );
}
