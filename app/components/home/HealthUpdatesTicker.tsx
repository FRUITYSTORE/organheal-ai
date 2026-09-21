"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "en"
  | "ar";

type HealthUpdateItem = {
  labelEn: string;
  labelAr: string;
  href: string;
  source: string;
};

const HEALTH_UPDATES: HealthUpdateItem[] = [
  {
    labelEn:
      "Consumer health guidance and new health education from NIH",
    labelAr:
      "إرشادات صحية ومحتوى تثقيفي موثوق من المعاهد الوطنية للصحة NIH",
    href:
      "https://newsinhealth.nih.gov/",
    source:
      "NIH",
  },
  {
    labelEn:
      "Public health guidance, prevention, and current health information",
    labelAr:
      "إرشادات الصحة العامة والوقاية والمعلومات الصحية من CDC",
    href:
      "https://www.cdc.gov/",
    source:
      "CDC",
  },
  {
    labelEn:
      "Explore evidence-based wellness resources from NIH",
    labelAr:
      "استكشف مصادر موثوقة للصحة والعافية من NIH",
    href:
      "https://www.nih.gov/health-information",
    source:
      "NIH",
  },
];

function getStoredLanguage(): Language {
  if (
    typeof window ===
    "undefined"
  ) {
    return "en";
  }

  const savedLanguage =
    localStorage.getItem(
      "organheal-language"
    ) ||
    localStorage.getItem(
      "organhealLanguage"
    ) ||
    localStorage.getItem(
      "organheal_language"
    ) ||
    localStorage.getItem(
      "language"
    ) ||
    "";

  return savedLanguage
    .toLowerCase()
    .startsWith(
      "ar"
    )
    ? "ar"
    : "en";
}

export default function HealthUpdatesTicker() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "en"
    );

  const isArabic =
    language ===
    "ar";

  useEffect(
    () => {
      function syncLanguage() {
        setLanguage(
          getStoredLanguage()
        );
      }

      syncLanguage();

      window.addEventListener(
        "storage",
        syncLanguage
      );

      window.addEventListener(
        "organheal-language-change",
        syncLanguage
      );

      return () => {
        window.removeEventListener(
          "storage",
          syncLanguage
        );

        window.removeEventListener(
          "organheal-language-change",
          syncLanguage
        );
      };
    },
    []
  );

  const repeatedUpdates = [
    ...HEALTH_UPDATES,
    ...HEALTH_UPDATES,
  ];

  return (
    <section
      className="healthUpdatesTicker"
      aria-label={
        isArabic
          ? "مصادر وتحديثات صحية موثوقة"
          : "Trusted health sources and updates"
      }
    >
      <style>{`
        .healthUpdatesTicker {
          width: min(1180px, calc(100% - 32px));
          margin: 18px auto 0;
          overflow: hidden;
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--oh-c-bg-teal-50, #f0fdfa) 96%, transparent),
              color-mix(in srgb, var(--oh-c-bg-slate-50, #f8fafc) 98%, transparent)
            );
          box-shadow:
            0 12px 34px
            rgba(15, 23, 42, 0.05);
        }

        .healthUpdatesTickerHeader {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 16px;
          border-bottom:
            1px solid
            rgba(15, 118, 110, 0.12);
          color: var(--oh-c-ink-teal-700, #0f766e);
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .healthUpdatesTickerDot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 999px;
          background: #14b8a6;
          box-shadow:
            0 0 0 5px
            rgba(20, 184, 166, 0.12);
        }

        .healthUpdatesTickerViewport {
          overflow: hidden;
        }

        .healthUpdatesTickerTrack {
          display: flex;
          width: max-content;
          align-items: center;
          animation:
            organHealHealthTicker
            34s linear infinite;
        }

        [dir="rtl"]
        .healthUpdatesTickerTrack {
          animation-name:
            organHealHealthTickerRtl;
        }

        .healthUpdatesTicker:hover
        .healthUpdatesTickerTrack {
          animation-play-state: paused;
        }

        .healthUpdatesTickerItem {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 26px;
          color: var(--oh-c-ink-ink-700, #334155);
          text-decoration: none;
          font-size: 0.86rem;
          font-weight: 750;
          white-space: nowrap;
        }

        .healthUpdatesTickerSource {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          border-radius: 999px;
          background:
            rgba(15, 118, 110, 0.1);
          color: var(--oh-c-ink-teal-700, #0f766e);
          font-size: 0.68rem;
          font-weight: 950;
        }

        .healthUpdatesTickerSeparator {
          color: #94a3b8;
        }

        @keyframes organHealHealthTicker {
          from {
            transform:
              translateX(0);
          }

          to {
            transform:
              translateX(-50%);
          }
        }

        @keyframes organHealHealthTickerRtl {
          from {
            transform:
              translateX(0);
          }

          to {
            transform:
              translateX(50%);
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .healthUpdatesTickerTrack {
            animation: none;
          }

          .healthUpdatesTickerViewport {
            overflow-x: auto;
          }
        }

        @media (
          max-width: 640px
        ) {
          .healthUpdatesTicker {
            border-radius: 15px;
          }

          .healthUpdatesTickerHeader {
            padding-inline: 13px;
          }

          .healthUpdatesTickerItem {
            padding-inline: 18px;
            font-size: 0.82rem;
          }
        }
      `}</style>

      <div className="healthUpdatesTickerHeader">
        <span
          className="healthUpdatesTickerDot"
          aria-hidden="true"
        />

        <span>
          {isArabic
            ? "مصادر صحية موثوقة"
            : "Trusted Health Sources"}
        </span>
      </div>

      <div className="healthUpdatesTickerViewport">
        <div className="healthUpdatesTickerTrack">
          {repeatedUpdates.map(
            (
              item,
              index
            ) => (
              <a
                key={`${item.source}-${index}`}
                href={
                  item.href
                }
                target="_blank"
                rel="noreferrer"
                className="healthUpdatesTickerItem"
              >
                <span className="healthUpdatesTickerSource">
                  {
                    item.source
                  }
                </span>

                <span>
                  {isArabic
                    ? item.labelAr
                    : item.labelEn}
                </span>

                <span
                  className="healthUpdatesTickerSeparator"
                  aria-hidden="true"
                >
                  •
                </span>
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
}