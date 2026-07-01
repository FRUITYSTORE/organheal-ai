"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type Language = "en" | "ar";
type BlogPost = (typeof blogPosts)[number];

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
      className="ohPageShell articleReadingPage"
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
        .articleReadingPage,
        .articleReadingPage * {
          box-sizing: border-box;
        }

        .articleReadingPage a {
          color: inherit;
          text-decoration: none;
        }

        .articleReadingPage .articleReadingShell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .articleReadingPage .articleTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .articleReadingPage .articleBackLink {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(15, 118, 110, 0.24);
          background: rgba(255, 255, 255, 0.82);
          color: #0f766e;
          font-weight: 950;
        }

        .articleReadingPage .articleHeader {
          padding: 34px;
          border-radius: 32px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background:
            radial-gradient(circle at 88% 18%, rgba(20, 184, 166, 0.16), transparent 26%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.07);
        }

        [dir="rtl"] .articleReadingPage .articleHeader {
          background:
            radial-gradient(circle at 12% 18%, rgba(20, 184, 166, 0.16), transparent 26%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
        }

        .articleReadingPage .articleHeaderGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 26px;
          align-items: start;
        }

        .articleReadingPage .articleTitle {
          max-width: 820px;
          margin: 12px 0 0;
          color: var(--oh-text);
          font-size: clamp(2.15rem, 4.2vw, 4rem);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.075em;
        }

        .articleReadingPage .articleLead {
          max-width: 780px;
          margin: 18px 0 0;
          color: var(--oh-muted);
          font-size: 1.08rem;
          line-height: 1.8;
        }

        .articleReadingPage .articleMetaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 20px;
        }

        .articleReadingPage .articleFactCard {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.9));
          color: white;
          padding: 20px;
          min-height: 100%;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
        }

        .articleReadingPage .articleFactCard::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          right: -70px;
          bottom: -80px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.48), transparent 66%);
          pointer-events: none;
        }

        [dir="rtl"] .articleReadingPage .articleFactCard::after {
          right: auto;
          left: -70px;
        }

        .articleReadingPage .articleFactLabel {
          position: relative;
          z-index: 1;
          margin: 0;
          color: rgba(209, 250, 229, 0.88);
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .articleReadingPage .articleFactValue {
          position: relative;
          z-index: 1;
          display: block;
          margin-top: 12px;
          font-size: 2.15rem;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .articleReadingPage .articleFactText {
          position: relative;
          z-index: 1;
          margin: 12px 0 0;
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.7;
          font-weight: 650;
        }

        .articleReadingPage .articleContentLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 24px;
          align-items: start;
        }

        .articleReadingPage .articleBodyCard {
          padding: 30px;
        }

        .articleReadingPage .articleBody {
          display: grid;
          gap: 22px;
          font-size: 1.08rem;
          line-height: 1.95;
        }

        .articleReadingPage .articleBody p {
          margin: 0;
          color: var(--oh-text);
        }

        .articleReadingPage .articleBody p:first-child::first-letter {
          float: ${isArabic ? "none" : "left"};
          color: #0f766e;
          font-size: 3.2rem;
          line-height: 0.95;
          padding-inline-end: 8px;
          font-weight: 950;
        }

        .articleReadingPage .articleSidePanel {
          position: sticky;
          top: 110px;
          display: grid;
          gap: 16px;
        }

        .articleReadingPage .articleInfoList {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .articleReadingPage .articleInfoItem {
          padding: 13px;
          border-radius: 17px;
          background: rgba(248, 250, 252, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .articleReadingPage .articleInfoLabel {
          display: block;
          color: var(--oh-muted);
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .articleReadingPage .articleInfoValue {
          display: block;
          margin-top: 5px;
          color: var(--oh-text);
          font-weight: 900;
          line-height: 1.45;
        }

        .articleReadingPage .markerRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .articleReadingPage .markerChip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.1);
          border: 1px solid rgba(15, 118, 110, 0.18);
          color: #0f766e;
          font-size: 0.8rem;
          font-weight: 900;
        }

        .articleReadingPage .articleSafetyStrip {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 20px;
          border: 1px solid rgba(37, 99, 235, 0.16);
          border-inline-start: 5px solid #2563eb;
          background: rgba(239, 246, 255, 0.78);
          color: var(--oh-muted);
          line-height: 1.65;
        }

        .articleReadingPage .articleSafetyStrip strong {
          color: var(--oh-text);
        }

        .articleReadingPage .articleSafetyMark {
          display: inline-flex;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          font-weight: 950;
        }

        .articleReadingPage .relatedGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .articleReadingPage .relatedCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100%;
          border-top: 5px solid #14b8a6;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .articleReadingPage .relatedCard:hover {
          transform: translateY(-4px);
          border-color: rgba(20, 184, 166, 0.48);
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
        }

        .articleReadingPage .relatedCategory {
          width: fit-content;
          margin: 0;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.12);
          color: #0f766e;
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        @media (max-width: 980px) {
          .articleReadingPage .articleHeaderGrid,
          .articleReadingPage .articleContentLayout {
            grid-template-columns: 1fr;
          }

          .articleReadingPage .articleSidePanel {
            position: static;
          }

          .articleReadingPage .relatedGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .articleReadingPage .articleTopBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .articleReadingPage .articleHeader,
          .articleReadingPage .articleBodyCard {
            padding: 24px;
          }

          .articleReadingPage .articleTitle {
            font-size: clamp(2rem, 10vw, 3rem);
          }
        }
      `}</style>

      <div className="ohContainer articleReadingShell ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="articleTopBar">
          <Link href="/blog" className="articleBackLink">
            {text("← Health Article Library", "مكتبة المقالات الصحية →")}
          </Link>

          <Link href="/library" className="articleBackLink">
            {text("Health Learning Hub", "مركز التعلّم الصحي")}
          </Link>
        </div>

        <section className="articleHeader">
          <div className="articleHeaderGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Article Guide", "دليل OrganHeal المعرفي")}
              </p>

              <h1 className="articleTitle">{title}</h1>

              <p className="articleLead">{excerpt}</p>

              <div className="articleMetaRow">
                <span className="ohStatusBadge good">{category}</span>
                <span className="ohStatusBadge neutral">{readTime}</span>
                <span className="ohStatusBadge neutral">{post.date}</span>
              </div>
            </div>

            <aside className="articleFactCard">
              <p className="articleFactLabel">
                {text("Reading focus", "محور القراءة")}
              </p>

              <span className="articleFactValue">
                {post.labMarkers.length || 1}
              </span>

              <p className="articleFactText">
                {post.labMarkers.length
                  ? text(
                      "Connected lab markers are indexed for clearer learning.",
                      "المؤشرات المرتبطة مفهرسة لتعلّم أوضح."
                    )
                  : text(
                      "This article focuses on practical health understanding.",
                      "يركز هذا المقال على فهم صحي عملي."
                    )}
              </p>
            </aside>
          </div>
        </section>

        <section className="articleSafetyStrip">
          <span className="articleSafetyMark">OH</span>

          <div>
            <strong>
              {text("Educational content only", "محتوى تعليمي فقط")}
            </strong>
            <br />
            {text(
              "This article supports learning and better doctor questions. It does not diagnose, treat, prescribe, or replace licensed medical care.",
              "هذا المقال يدعم التعلّم وتحضير أسئلة أفضل للطبيب. لا يقدم تشخيصًا أو علاجًا أو وصفات ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="articleContentLayout">
          <article className="ohCard articleBodyCard">
            <div className="articleBody">
              {articleParagraphs.map((paragraph, index) => (
                <p key={`${post.slug}-paragraph-${index}`}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="articleSidePanel">
            <div className="ohCard">
              <p className="ohMetricLabel">
                {text("Article details", "تفاصيل المقال")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.2rem" }}>
                {text("Reading context", "سياق القراءة")}
              </h2>

              <div className="articleInfoList">
                <div className="articleInfoItem">
                  <span className="articleInfoLabel">
                    {text("Health area", "المجال الصحي")}
                  </span>
                  <span className="articleInfoValue">{category}</span>
                </div>

                <div className="articleInfoItem">
                  <span className="articleInfoLabel">
                    {text("Organ system", "الجهاز/العضو")}
                  </span>
                  <span className="articleInfoValue">{organSystem}</span>
                </div>

                <div className="articleInfoItem">
                  <span className="articleInfoLabel">
                    {text("Reading time", "وقت القراءة")}
                  </span>
                  <span className="articleInfoValue">{readTime}</span>
                </div>
              </div>
            </div>

            {post.labMarkers.length > 0 && (
              <div className="ohCard">
                <p className="ohMetricLabel">
                  {text("Marker index", "فهرس المؤشرات")}
                </p>

                <h2 className="ohCardTitle" style={{ fontSize: "1.2rem" }}>
                  {text("Mentioned lab markers", "مؤشرات مختبر مذكورة")}
                </h2>

                <div className="markerRow">
                  {post.labMarkers.map((marker) => (
                    <span className="markerChip" key={`${post.slug}-${marker}`}>
                      {marker}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="ohCard">
              <p className="ohMetricLabel">
                {text("Reading boundary", "حد القراءة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.2rem" }}>
                {text("Use this to prepare questions.", "استخدمه لتحضير الأسئلة.")}
              </h2>

              <p className="ohCardText">
                {text(
                  "Bring important results, symptoms, and medication details to a licensed clinician when discussing your health.",
                  "عند مناقشة صحتك، أحضر النتائج المهمة والأعراض وتفاصيل الأدوية إلى مختص طبي مرخص."
                )}
              </p>
            </div>
          </aside>
        </section>

        {relatedPosts.length > 0 && (
          <section className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Related reading", "قراءات مرتبطة")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
                    "Continue learning in the same health area.",
                    "تابع التعلّم في نفس المجال الصحي."
                  )}
                </h2>
              </div>
            </div>

            <div className="relatedGrid">
              {relatedPosts.map((relatedPost) => (
                <Link
                  href={`/blog/${relatedPost.slug}`}
                  className="ohCard relatedCard"
                  key={relatedPost.slug}
                >
                  <p className="relatedCategory">
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
      </div>
    </main>
  );
}
