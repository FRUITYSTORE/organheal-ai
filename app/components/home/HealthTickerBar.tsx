"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { getDailyTips, TIP_CATEGORY_LABELS } from "@/lib/health-updates/daily-tips";
import { openHealthChat } from "@/lib/health-updates/chat-events";

import "./health-ticker.css";

type TickerItem = {
  key: string;
  label: string;
  title: string;
  detail: string;
  url: string | null;
  tone: string;
  question: string | null;
};

type Language = "en" | "ar";

const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/verify",
  "/onboarding",
  "/reset-password",
];

// Collapsing lasts for this browser session only, so the bar is back on the
// next visit instead of staying hidden forever.
const COLLAPSE_KEY = "organheal-ticker-collapsed";
const SECONDS_PER_ITEM = 14;

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function readCollapsed(): boolean {
  try {
    return sessionStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    sessionStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  } catch {
    // The choice simply won't be remembered.
  }
}

async function loadNotes(
  language: Language,
  signal: AbortSignal
): Promise<{ id: string; title: string; body: string; url: string | null; tone: string }[]> {
  try {
    const response = await fetch(`/api/health-announcements?lang=${language}`, { signal });

    if (!response.ok) return [];

    const data = (await response.json()) as { items?: never[] };

    return data.items ?? [];
  } catch {
    return [];
  }
}

type BriefArticle = {
  slug: string;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
};

async function loadArticles(signal: AbortSignal): Promise<BriefArticle[]> {
  try {
    const response = await fetch("/api/articles?brief=1", { signal });

    if (!response.ok) return [];

    const data = (await response.json()) as { articles?: BriefArticle[] };

    return data.articles ?? [];
  } catch {
    return [];
  }
}

function TickerEntry({ item }: { item: TickerItem }) {
  const content = (
    <>
      <span className="ohTickerLabel" data-tone={item.tone}>
        {item.label}
      </span>
      <span className="ohTickerText" dir="auto">
        <strong>{item.title}</strong>
        {item.detail ? ` — ${item.detail}` : ""}
      </span>
    </>
  );

  if (item.url) {
    // Links to pages on this site open in the same tab; outside links in a new one.
    const internal = item.url.startsWith("/");

    return (
      <a
        className="ohTickerItem"
        href={item.url}
        {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      >
        {content}
      </a>
    );
  }

  if (item.question) {
    const question = item.question;

    return (
      <button type="button" className="ohTickerItem" onClick={() => openHealthChat(question)}>
        {content}
      </button>
    );
  }

  return <span className="ohTickerItem">{content}</span>;
}

export default function HealthTickerBar() {
  const pathname = usePathname() ?? "/";
  // The bar renders nothing until its items load on the client, so reading
  // browser storage in the initializers cannot cause a hydration mismatch.
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const isArabic = language === "ar";
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    function sync() {
      setLanguage(getStoredLanguage());
    }

    window.addEventListener("storage", sync);
    window.addEventListener("organheal-language-change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("organheal-language-change", sync);
    };
  }, []);

  useEffect(() => {
    if (hidden) return;

    const controller = new AbortController();

    void Promise.all([
      loadNotes(language, controller.signal),
      loadArticles(controller.signal),
    ]).then(([notes, articles]) => {
      if (controller.signal.aborted) return;

      const owned: TickerItem[] = notes.map((note) => ({
        key: `note-${note.id}`,
        label: language === "ar" ? "من OrganHeal" : "OrganHeal",
        title: note.title,
        detail: note.body,
        url: note.url,
        tone: note.tone,
        question: null,
      }));

      const written: TickerItem[] = articles.map((article) => ({
        key: `article-${article.slug}`,
        label: language === "ar" ? "مقال جديد" : "New article",
        title: language === "ar" ? article.titleAr : article.title,
        detail: language === "ar" ? article.excerptAr : article.excerpt,
        url: `/blog/${article.slug}`,
        tone: "teal",
        question: null,
      }));

      const tips: TickerItem[] = getDailyTips(new Date()).map((tip) => {
        const copy = language === "ar" ? tip.ar : tip.en;

        return {
          key: `tip-${tip.id}`,
          label: TIP_CATEGORY_LABELS[tip.category][language],
          title: copy.title,
          detail: copy.body,
          url: null,
          tone: "tip",
          question:
            language === "ar"
              ? `اشرح لي أكثر: ${copy.title}`
              : `Tell me more about: ${copy.title}`,
        };
      });

      setItems([...owned, ...written, ...tips]);
    });

    return () => controller.abort();
  }, [language, hidden]);

  if (hidden || items.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="ohTickerCollapsed" dir={isArabic ? "rtl" : "ltr"}>
        <button
          type="button"
          onClick={() => {
            writeCollapsed(false);
            setCollapsed(false);
          }}
        >
          {isArabic ? "إظهار شريط النصائح والمقالات ▾" : "Show the health tips bar ▾"}
        </button>
      </div>
    );
  }

  const group = (copy: number) => (
    <div className="ohTickerGroup" key={copy} aria-hidden={copy === 1 ? true : undefined}>
      {items.map((item) => (
        <TickerEntry key={item.key} item={item} />
      ))}
    </div>
  );

  return (
    <div
      className="ohTicker"
      dir={isArabic ? "rtl" : "ltr"}
      role="region"
      aria-label={isArabic ? "أحدث المعلومات الصحية" : "Latest health information"}
    >
      <div className="ohTickerInner">
        <div className="ohTickerViewport">
          <div
            className="ohTickerTrack"
            style={{ ["--ohTickerDuration" as string]: `${items.length * SECONDS_PER_ITEM}s` }}
          >
            {group(0)}
            {group(1)}
          </div>
        </div>

        <button
          type="button"
          className="ohTickerClose"
          aria-label={isArabic ? "طي الشريط" : "Collapse bar"}
          title={isArabic ? "طي الشريط" : "Collapse bar"}
          onClick={() => {
            writeCollapsed(true);
            setCollapsed(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
