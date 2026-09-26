"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import "./health-ticker.css";

type TickerItem = {
  key: string;
  label: string;
  title: string;
  detail: string;
  url: string | null;
  tone: string;
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

const ROTATE_MS = 7000;
const DISMISS_KEY = "organheal-ticker-dismissed";

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

async function loadJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { signal });

    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function HealthTickerBar() {
  const pathname = usePathname() ?? "/";
  // The bar renders nothing until its items load on the client, so reading
  // browser storage in the initializers cannot cause a hydration mismatch.
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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

    Promise.all([
      loadJson<{
        items?: { id: string; title: string; body: string; url: string | null; tone: string }[];
      }>(`/api/health-announcements?lang=${language}`, controller.signal),
      loadJson<{
        items?: { title: string; url: string; source: string }[];
      }>(`/api/health-updates?lang=${language}`, controller.signal),
    ]).then(([notes, news]) => {
      if (controller.signal.aborted) return;

      const owned: TickerItem[] = (notes?.items ?? []).map((note) => ({
        key: `note-${note.id}`,
        label: language === "ar" ? "من OrganHeal" : "OrganHeal",
        title: note.title,
        detail: note.body,
        url: note.url,
        tone: note.tone,
      }));

      const who: TickerItem[] = (news?.items ?? []).slice(0, 4).map((item) => ({
        key: `who-${item.url}`,
        label: item.source || "WHO",
        title: item.title,
        detail: "",
        url: item.url,
        tone: "news",
      }));

      setItems([...owned, ...who]);
      setIndex(0);
    });

    return () => controller.abort();
  }, [language, hidden, dismissed]);

  useEffect(() => {
    if (paused || items.length < 2) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  if (hidden || dismissed || items.length === 0) {
    return null;
  }

  const item = items[index % items.length];

  const body = (
    <>
      <span className="ohTickerLabel">{item.label}</span>
      <span className="ohTickerText" dir="auto">
        <strong>{item.title}</strong>
        {item.detail ? ` — ${item.detail}` : ""}
      </span>
    </>
  );

  return (
    <div
      className="ohTicker"
      data-tone={item.tone}
      dir={isArabic ? "rtl" : "ltr"}
      role="region"
      aria-label={isArabic ? "آخر الأخبار الصحية" : "Latest health news"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ohTickerInner">
        {item.url ? (
          <a
            className="ohTickerItem"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {body}
          </a>
        ) : (
          <div className="ohTickerItem">{body}</div>
        )}

        {items.length > 1 && (
          <button
            type="button"
            className="ohTickerBtn"
            aria-label={isArabic ? "الخبر التالي" : "Next item"}
            onClick={() => setIndex((current) => (current + 1) % items.length)}
          >
            {isArabic ? "‹" : "›"}
          </button>
        )}

        <button
          type="button"
          className="ohTickerBtn"
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
