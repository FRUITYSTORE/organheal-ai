"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type BlogPost = (typeof blogPosts)[number];

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function normalizeContent(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  const title = isArabic ? post.titleAr : post.title;
  const excerpt = isArabic ? post.excerptAr : post.excerpt;
  const category = isArabic ? post.categoryAr : post.category;
  const organSystem = isArabic ? post.organSystemAr : post.organSystem;
  const readTime = isArabic ? post.readTimeAr : post.readTime;
  const articleParagraphs = normalizeContent(isArabic ? post.contentAr : post.content);

  const relatedPosts = useMemo(() => {
    return blogPosts
      .filter((item) => item.slug !== post.slug && item.category === post.category)
      .slice(0, 3);
  }, [post.category, post.slug]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.organheal.com/blog/${post.slug}`,
    },
    author: {
      "@type": "Organization",
      name: "OrganHeal AI",
    },
    publisher: {
      "@type": "Organization",
      name: "OrganHeal AI",
      logo: {
        "@type": "ImageObject",
        url: "https://www.organheal.com/icon.svg",
      },
    },
    keywords: [post.category, post.organSystem, ...post.labMarkers].join(", "),
  };

  return (
    <main
      className="ohPageShell blogPostCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />

      <style>{`
        .blogPostCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .blogPostCommandPage .blogPostShell {
          max-width: 960px;
          margin: 0 auto;
        }

        .blogPostCommandPage .blogPostMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 18px;
        }

        .blogPostCommandPage .blogPostArticle {
          display: grid;
          gap: 20px;
          font-size: 1.05rem;
          line-height: 1.9;
        }

        .blogPostCommandPage .blogPostArticle p {
          margin: 0;
          color: var(--oh-text);
        }

        .blogPostCommandPage .blogPostBack {
          color: #0f766e;
          font-weight: 900;
        }

        .blogPostCommandPage .blogMarkerRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .blogPostCommandPage .blogMarker {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: var(--oh-muted);
          font-size: 0.8rem;
          font-weight: 850;
        }

        .blogPostCommandPage .blogPostRelatedGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .blogPostCommandPage .blogPostRelatedCard {
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .blogPostCommandPage .blogPostRelatedCard:hover {
          transform: translateY(-3px);
          border-color: rgba(20, 184, 166, 0.34);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 760px) {
          .blogPostCommandPage .blogPostRelatedGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="blogPostShell ohStack large">
          <Link href="/blog" className="blogPostBack">
            {text("← Back to Articles", "العودة إلى المقالات →")}
          </Link>

          <section className="ohHero">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Article", "مقال من OrganHeal")}
              </p>

              <h1 className="ohTitle">{title}</h1>

              <p className="ohLead">{excerpt}</p>

              <div className="blogPostMeta">
                <span className="ohStatusBadge good">{category}</span>
                <span className="ohStatusBadge neutral">{post.date}</span>
                <span className="ohStatusBadge neutral">{readTime}</span>
                <span className="ohStatusBadge moderate">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <div className="blogMarkerRow">
                <span className="blogMarker">{organSystem}</span>

                {post.labMarkers.map((marker) => (
                  <span className="blogMarker" key={`${post.slug}-${marker}`}>
                    {marker}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="ohTrustNotice">
            <span aria-hidden="true">OH</span>
            <div>
              <strong>
                {text("Educational content only", "محتوى تعليمي فقط")}
              </strong>
              <br />
              {text(
                "This article helps you understand health topics and prepare better questions. It does not diagnose, treat, prescribe, or replace licensed medical care.",
                "هذا المقال يساعدك على فهم المواضيع الصحية وتحضير أسئلة أفضل. لا يقدم تشخيصًا أو علاجًا أو وصفات ولا يستبدل الرعاية الطبية المرخصة."
              )}
            </div>
          </section>

          <article className="ohCard blogPostArticle">
            {articleParagraphs.map((paragraph, index) => (
              <p key={`${post.slug}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </article>

          {relatedPosts.length > 0 && (
            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Related reading", "قراءات مرتبطة")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text("Continue learning in the same area", "تابع التعلم في نفس المجال")}
                  </h2>
                </div>
              </div>

              <div className="blogPostRelatedGrid">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    href={`/blog/${relatedPost.slug}`}
                    className="ohCard blogPostRelatedCard"
                    key={relatedPost.slug}
                  >
                    <p className="ohMetricLabel">
                      {isArabic ? relatedPost.categoryAr : relatedPost.category}
                    </p>

                    <h3 className="ohCardTitle" style={{ fontSize: "1.05rem" }}>
                      {isArabic ? relatedPost.titleAr : relatedPost.title}
                    </h3>

                    <p className="ohCardText">
                      {isArabic ? relatedPost.excerptAr : relatedPost.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="ohActionPanel">
            <div className="ohCardHeader" style={{ marginBottom: 0 }}>
              <div>
                <p className="ohMetricLabel">
                  {text("Education library", "مكتبة التثقيف")}
                </p>

                <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                  {text(
                    "Learn by topic, not by scattered tools.",
                    "تعلّم حسب الموضوع، وليس عبر أدوات متفرقة."
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Return to the education library to continue structured learning across organ health, lab markers, and prevention topics.",
                    "ارجع إلى مكتبة التثقيف لمتابعة التعلم المنظم حول صحة الأعضاء، مؤشرات المختبر، ومواضيع الوقاية."
                  )}
                </p>
              </div>

              <div className="ohButtonRow">
                <Link href="/library" className="primaryBtn">
                  {text("Open Education Library", "فتح مكتبة التثقيف")}
                </Link>

                <Link href="/blog" className="secondaryBtn">
                  {text("All Articles", "كل المقالات")}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

