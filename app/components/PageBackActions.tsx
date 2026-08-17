"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

type BackProps = {
  href?: string;
  backHref?: string;
  to?: string;
  label?: string;
  backLabel?: string;
};

type Language =
  | "en"
  | "ar";

function getStoredLanguage():
  Language {
  const saved =
    localStorage.getItem(
      "organheal-language"
    ) ||
    localStorage.getItem(
      "organhealLanguage"
    ) ||
    localStorage.getItem(
      "language"
    ) ||
    "";

  return saved
    .toLowerCase()
    .startsWith(
      "ar"
    )
    ? "ar"
    : "en";
}

export default function PageBackActions(
  props:
    BackProps
) {
  const [
    language,
    setLanguage,
  ] =
    useState<
      Language
    >(
      "en"
    );

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

  const isArabic =
    language ===
    "ar";

  const href =
    props.href ||
    props.backHref ||
    props.to ||
    "/dashboard";

  const label =
    props.label ||
    props.backLabel ||
    (
      isArabic
        ? "← رجوع"
        : "← Back"
    );

  return (
    <div className="organhealBackRow">
      <style>{`
        .organhealBackRow {
          width: min(
            1180px,
            calc(100% - 28px)
          );
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
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff !important;
          border:
            1px solid
            rgba(
              15,
              23,
              42,
              0.25
            );
          box-shadow:
            0 14px 34px
            rgba(
              15,
              23,
              42,
              0.24
            );
          font-size: 0.9rem;
          font-weight: 950;
          text-decoration: none;
          line-height: 1;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .organhealBackButton:hover {
          transform:
            translateY(
              -1px
            );
          box-shadow:
            0 18px 42px
            rgba(
              15,
              23,
              42,
              0.28
            );
        }
      `}</style>

      <Link
        href={
          href
        }
        className="organhealBackButton"
      >
        {label}
      </Link>
    </div>
  );
}