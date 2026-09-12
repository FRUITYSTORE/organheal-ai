"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  blogPosts,
} from "@/lib/blogData";

type Language =
  | "en"
  | "ar";

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

export default function FeaturedHealthArticles() {
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

  const featuredPosts =
    useMemo(
      () =>
        [...blogPosts]
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.date
              ).getTime() -
              new Date(
                first.date
              ).getTime()
          )
          .slice(
            0,
            3
          ),
      []
    );

  return (
    <section className="featuredHealthArticles">
      <style>{`
        .featuredHealthArticles {
          position: relative;
          overflow: hidden;
          padding: 30px;
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 92% 8%,
              rgba(20, 184, 166, 0.13),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #ffffff,
              #f8fafc
            );
          box-shadow:
            0 22px 58px
            rgba(15, 23, 42, 0.06);
        }

        .featuredHealthArticlesHeader {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
        }

        .featuredHealthArticlesEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .featuredHealthArticlesTitle {
          margin: 8px 0 0;
          max-width: 720px;
          color: var(--oh-text);
          font-size:
            clamp(
              1.65rem,
              3vw,
              2.35rem
            );
          line-height: 1.15;
          letter-spacing: -0.04em;
        }

        .featuredHealthArticlesDescription {
          margin: 10px 0 0;
          max-width: 720px;
          color: var(--oh-muted);
          line-height: 1.7;
        }

        .featuredHealthArticlesAll {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid rgba(15, 118, 110, 0.22);
          border-radius: 999px;
          background: white;
          color: #0f766e;
          font-weight: 900;
          text-decoration: none;
        }

        .featuredHealthArticlesGrid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 18px;
          margin-top: 24px;
        }

        .featuredHealthArticleCard {
          display: flex;
          min-width: 0;
          min-height: 100%;
          flex-direction: column;
          padding: 20px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-top: 4px solid #14b8a6;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.94);
          text-decoration: none;
          box-shadow:
            0 14px 34px
            rgba(15, 23, 42, 0.05);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .featuredHealthArticleCard:hover {
          transform:
            translateY(-3px);
          box-shadow:
            0 20px 44px
            rgba(15, 23, 42, 0.09);
        }

        .featuredHealthArticleMeta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .featuredHealthArticleCategory {
          display: inline-flex;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background:
            rgba(15, 118, 110, 0.1);
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 950;
        }

        .featuredHealthArticleReadTime {
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .featuredHealthArticleTitle {
          margin: 16px 0 0;
          color: var(--oh-text);
          font-size: 1.18rem;
          line-height: 1.3;
          letter-spacing: -0.025em;
        }

        .featuredHealthArticleExcerpt {
          flex: 1;
          margin: 10px 0 0;
          color: var(--oh-muted);
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .featuredHealthArticleFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top:
            1px solid
            rgba(148, 163, 184, 0.16);
        }

        .featuredHealthArticleMarkers {
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          gap: 6px;
        }

        .featuredHealthArticleMarker {
          padding: 4px 7px;
          border-radius: 999px;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 800;
        }

        .featuredHealthArticleRead {
          flex: 0 0 auto;
          color: #0f766e;
          font-size: 0.82rem;
          font-weight: 950;
        }

        @media (
          max-width: 900px
        ) {
          .featuredHealthArticlesGrid {
            grid-template-columns:
              1fr;
          }

          .featuredHealthArticlesHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (
          max-width: 640px
        ) {
          .featuredHealthArticles {
            padding: 22px;
            border-radius: 22px;
          }

          .featuredHealthArticlesAll {
            width: 100%;
          }
        }
      `}</style>

      <div className="featuredHealthArticlesHeader">
        <div>
          <p className="featuredHealthArticlesEyebrow">
            {isArabic
              ? "مقالات صحية"
              : "Health Articles"}
          </p>

          <h2 className="featuredHealthArticlesTitle">
            {isArabic
              ? "تعلّم أكثر عن النتائج والمواضيع التي تهم صحتك."
              : "Understand the health topics and results that matter to you."}
          </h2>

          <p className="featuredHealthArticlesDescription">
            {isArabic
              ? "شروحات مبسطة تساعدك على فهم الفحوصات والمؤشرات الصحية والاستعداد لمناقشة أفضل مع الطبيب."
              : "Patient-friendly explanations for lab results, health topics, and better conversations with your clinician."}
          </p>
        </div>

        <Link
          href="/blog"
          className="featuredHealthArticlesAll"
        >
          {isArabic
            ? "عرض كل المقالات"
            : "Explore all articles"}
        </Link>
      </div>

      <div className="featuredHealthArticlesGrid">
        {featuredPosts.map(
          post => {
            const title =
              isArabic
                ? post.titleAr
                : post.title;

            const excerpt =
              isArabic
                ? post.excerptAr
                : post.excerpt;

            const category =
              isArabic
                ? post.categoryAr
                : post.category;

            const readTime =
              isArabic
                ? post.readTimeAr
                : post.readTime;

            return (
              <Link
                key={
                  post.slug
                }
                href={`/blog/${post.slug}`}
                className="featuredHealthArticleCard"
              >
                <div className="featuredHealthArticleMeta">
                  <span className="featuredHealthArticleCategory">
                    {
                      category
                    }
                  </span>

                  <span className="featuredHealthArticleReadTime">
                    {
                      readTime
                    }
                  </span>
                </div>

                <h3 className="featuredHealthArticleTitle">
                  {
                    title
                  }
                </h3>

                <p className="featuredHealthArticleExcerpt">
                  {
                    excerpt
                  }
                </p>

                <div className="featuredHealthArticleFooter">
                  <div className="featuredHealthArticleMarkers">
                    {post.labMarkers
                      .slice(
                        0,
                        3
                      )
                      .map(
                        marker => (
                          <span
                            className="featuredHealthArticleMarker"
                            key={
                              marker
                            }
                          >
                            {
                              marker
                            }
                          </span>
                        )
                      )}
                  </div>

                  <span className="featuredHealthArticleRead">
                    {isArabic
                      ? "اقرأ ←"
                      : "Read →"}
                  </span>
                </div>
              </Link>
            );
          }
        )}
      </div>
    </section>
  );
}