"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BackProps = {
  href?: string;
  backHref?: string;
  to?: string;
  label?: string;
  backLabel?: string;
};

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function PageBackActions(props: BackProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    // document.referrer only reflects the tab's original hard page load —
    // it never updates on Next.js client-side navigation, so it can't be
    // used to detect "came from another in-app page". history.length does
    // grow correctly with every client-side navigation, so it's the
    // reliable signal for whether a real previous entry exists to return to.
    setCanGoBack(window.history.length > 1);
  }, []);

  const isArabic = language === "ar";

  const fallbackHref =
    props.href || props.backHref || props.to || "/dashboard";

  const label =
    props.label || props.backLabel || (isArabic ? "رجوع" : "Back");

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (canGoBack) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <div className="organhealBackRow">
      <style>{`
        .organhealBackRow {
          width: min(1180px, calc(100% - 28px));
          margin: 0 auto 18px;
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }

        [dir="rtl"] .organhealBackRow {
          justify-content: flex-end;
        }

        .organhealBackButton {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 18px 0 14px;
          border-radius: 999px;
          background: #ffffff;
          color: #334155 !important;
          border: 1px solid rgba(15, 23, 42, 0.14);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          line-height: 1;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        [dir="rtl"] .organhealBackButton {
          padding: 0 14px 0 18px;
        }

        .organhealBackButton:hover {
          transform: translateY(-1px);
          border-color: rgba(15, 118, 110, 0.4);
          background: rgba(15, 118, 110, 0.05);
          color: #0f766e !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
        }

        .organhealBackButton:focus-visible {
          outline: 2px solid rgba(15, 118, 110, 0.55);
          outline-offset: 2px;
        }

        .organhealBackIcon {
          display: inline-flex;
          font-size: 1rem;
          transition: transform 0.18s ease;
        }

        [dir="rtl"] .organhealBackIcon {
          transform: scaleX(-1);
        }

        .organhealBackButton:hover .organhealBackIcon {
          transform: translateX(-2px);
        }

        [dir="rtl"] .organhealBackButton:hover .organhealBackIcon {
          transform: scaleX(-1) translateX(-2px);
        }
      `}</style>

      <Link
        href={fallbackHref}
        className="organhealBackButton"
        onClick={handleClick}
      >
        <span className="organhealBackIcon" aria-hidden="true">
          ‹
        </span>
        {label}
      </Link>
    </div>
  );
}
