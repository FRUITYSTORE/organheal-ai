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
  "/admin",
];

const DISMISS_KEY = "organheal-ticker-dismissed";
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

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
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
    return (
      <a
        className="ohTickerItem"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
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
  const [dismissed, setDismissed] = useState(readDismissed);

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
    if (hidden || dismissed) return;

    const controller = new AbortController();

    void loadNotes(language, controller.signal).then((notes) => {
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

      setItems([...owned, ...tips]);
    });

    return () => controller.abort();
  }, [language, hidden, dismissed]);

  if (hidden || dismissed || items.length === 0) {
    return null;
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
          aria-label={isArabic ? "إغلاق الشريط" : "Dismiss bar"}
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Dismissal simply won't persist for this tab.
            }

            setDismissed(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
