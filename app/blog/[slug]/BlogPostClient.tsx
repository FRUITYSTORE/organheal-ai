"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type Language = "en" | "ar";
type BlogPost = (typeof blogPosts)[0];

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

  function getLocalizedField(baseKey: string) {
    const record = post as BlogPost & Record<string, unknown>;
    const arabicValue = record[`${baseKey}Ar`];
    const englishValue = record[baseKey];

    return isArabic ? arabicValue || englishValue : englishValue || arabicValue;
  }

  const title = isArabic ? post.titleAr : post.title;
  const excerpt = isArabic ? post.excerptAr : post.excerpt;
  const category = isArabic ? post.categoryAr : post.category;

  const articleParagraphs = useMemo(() => {
    const content = getLocalizedField("content");
    const body = getLocalizedField("body");
    const paragraphs = normalizeContent(content).length
      ? normalizeContent(content)
      : normalizeContent(body);

    return paragraphs.length ? paragraphs : [excerpt];
  }, [excerpt, isArabic, post]);

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

        .blogPostCommandPage .blogPostRelatedGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
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
            {text("← Back to Blog", "العودة إلى المدونة →")}
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
                <span className="ohStatusBadge moderate">
                  {text("Educational", "تعليمي")}
                </span>
              </div>
            </div>
          </section>

          <section className="ohTrustNotice">
            <span aria-hidden="true">🩺</span>
            <div>
              <strong>
                {text("Educational content only", "محتوى تعليمي فقط")}
              </strong>
              <br />
              {text(
                "OrganHeal articles are for education only. They do not diagnose, treat, prescribe, or replace licensed medical care.",
                "مقالات OrganHeal للتثقيف فقط. لا تقدم تشخيصًا أو علاجًا أو وصفات ولا تستبدل الرعاية الطبية المرخصة."
              )}
            </div>
          </section>

          <article className="ohCard blogPostArticle">
            {articleParagraphs.map((paragraph, index) => (
              <p key={`${post.slug}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </article>

          <section className="ohActionPanel">
            <div className="ohCardHeader" style={{ marginBottom: 0 }}>
              <div>
                <p className="ohMetricLabel">
                  {text("Next useful step", "الخطوة المفيدة التالية")}
                </p>

                <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                  {text(
                    "Turn health education into action.",
                    "حوّل التثقيف الصحي إلى خطوة عملية."
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Continue with an assessment, upload a report, or use OrganHeal Intelligence to understand your own health journey.",
                    "تابع بتقييم صحي، ارفع تقريرًا، أو استخدم ذكاء OrganHeal لفهم رحلتك الصحية الخاصة."
                  )}
                </p>
              </div>

              <div className="ohButtonRow">
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>

                <Link href="/medical-disclaimer" className="secondaryBtn">
                  {text("Medical Disclaimer", "إخلاء المسؤولية")}
                </Link>
              </div>
            </div>
          </section>

          <section className="blogPostRelatedGrid">
            <Link href="/blog" className="ohCard">
              <p className="ohMetricLabel">{text("Blog", "المدونة")}</p>
              <h2 className="ohCardTitle">{text("More Articles", "مقالات أكثر")}</h2>
              <p className="ohCardText">
                {text(
                  "Explore more OrganHeal educational content.",
                  "استكشف المزيد من محتوى OrganHeal التعليمي."
                )}
              </p>
            </Link>

            <Link href="/library" className="ohCard">
              <p className="ohMetricLabel">{text("Library", "المكتبة")}</p>
              <h2 className="ohCardTitle">{text("Health Library", "المكتبة الصحية")}</h2>
              <p className="ohCardText">
                {text(
                  "Use the library to learn by topic.",
                  "استخدم المكتبة للتعلم حسب الموضوع."
                )}
              </p>
            </Link>

            <Link href="/assistant" className="ohCard">
              <p className="ohMetricLabel">{text("Assistant", "المساعد")}</p>
              <h2 className="ohCardTitle">{text("Ask OrganHeal AI", "اسأل OrganHeal AI")}</h2>
              <p className="ohCardText">
                {text(
                  "Ask educational questions about your health journey.",
                  "اسأل أسئلة تعليمية عن رحلتك الصحية."
                )}
              </p>
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
