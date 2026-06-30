"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

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

export default function BlogPage() {
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

  const categorySummary = useMemo(() => {
    const categories = new Map<string, number>();

    blogPosts.forEach((post) => {
      const category = isArabic ? post.categoryAr : post.category;
      categories.set(category, (categories.get(category) || 0) + 1);
    });

    return Array.from(categories.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }, [isArabic]);

  return (
    <main
      className="ohPageShell blogCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .blogCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .blogCommandPage .blogGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .blogCommandPage .blogCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .blogCommandPage .blogCard:hover {
          transform: translateY(-3px);
          border-color: rgba(20, 184, 166, 0.34);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .blogCommandPage .blogCategory {
          width: fit-content;
          margin: 0;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.1);
          color: #0f766e;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .blogCommandPage .blogExcerpt {
          flex: 1;
        }

        .blogCommandPage .blogMetaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .blogCommandPage .blogMarkerRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .blogCommandPage .blogMarker {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: var(--oh-muted);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .blogCommandPage .blogCardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.22);
        }

        .blogCommandPage .blogDate {
          color: var(--oh-muted);
          font-size: 0.88rem;
          font-weight: 800;
        }

        .blogCommandPage .blogReadMore {
          color: #0f766e;
          font-weight: 900;
        }

        .blogCommandPage .blogCategoryGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 980px) {
          .blogCommandPage .blogGrid,
          .blogCommandPage .blogCategoryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .blogCommandPage .blogGrid,
          .blogCommandPage .blogCategoryGrid {
            grid-template-columns: 1fr;
          }

          .blogCommandPage .blogCardFooter {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Articles", "مقالات OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text("Health education that prepares better questions.", "تثقيف صحي يساعدك على طرح أسئلة أفضل.")}
              </h1>

              <p className="ohLead">
                {text(
                  "Read simple educational articles about organ health, lab markers, prevention, and health intelligence. This section is for learning only, not for using private tools.",
                  "اقرأ مقالات تعليمية مبسطة عن صحة الأعضاء، مؤشرات المختبر، الوقاية، والذكاء الصحي. هذا القسم للتعلم فقط وليس لاستخدام الأدوات الخاصة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/library" className="primaryBtn">
                  {text("Back to Education Library", "العودة إلى مكتبة التثقيف")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Content foundation", "أساس المحتوى")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      `${blogPosts.length} educational articles`,
                      `${blogPosts.length} مقالات تعليمية`
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Readable", "سهل القراءة")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Each article is structured with category, organ system, lab markers, audience, and reading time so it can support smarter recommendations later.",
                  "كل مقال منظم حسب التصنيف، الجهاز/العضو، مؤشرات المختبر، الجمهور، ووقت القراءة حتى يدعم توصيات أذكى لاحقًا."
                )}
              </p>
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
              "Articles help you understand health topics and prepare better questions. They do not diagnose, treat, prescribe, or replace licensed medical care.",
              "المقالات تساعدك على فهم المواضيع الصحية وتحضير أسئلة أفضل. لا تقدم تشخيصًا أو علاجًا أو وصفات ولا تستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Learning topics", "مواضيع التعلّم")}
              </p>

              <h2 className="ohCardTitle">
                {text("Browse by health area", "تصفح حسب المجال الصحي")}
              </h2>
            </div>
          </div>

          <div className="blogCategoryGrid">
            {categorySummary.map((item) => (
              <article className="ohMetricCard" key={item.category}>
                <span className="ohMetricLabel">{item.category}</span>
                <span className="ohMetricValue">{item.count}</span>
                <span className="ohMetricHint">
                  {text("Article available", "مقال متوفر")}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="blogGrid">
          {blogPosts.map((post) => {
            const title = isArabic ? post.titleAr : post.title;
            const excerpt = isArabic ? post.excerptAr : post.excerpt;
            const category = isArabic ? post.categoryAr : post.category;
            const organSystem = isArabic ? post.organSystemAr : post.organSystem;
            const readTime = isArabic ? post.readTimeAr : post.readTime;

            return (
              <article key={post.slug} className="ohCard blogCard">
                <div className="blogMetaRow">
                  <p className="blogCategory">{category}</p>
                  <span className="ohStatusBadge neutral">{readTime}</span>
                </div>

                <h2 className="ohCardTitle">{title}</h2>

                <p className="ohCardText blogExcerpt">{excerpt}</p>

                <div className="blogMarkerRow">
                  <span className="blogMarker">{organSystem}</span>

                  {post.labMarkers.slice(0, 3).map((marker) => (
                    <span className="blogMarker" key={`${post.slug}-${marker}`}>
                      {marker}
                    </span>
                  ))}
                </div>

                <div className="blogCardFooter">
                  <span className="blogDate">{post.date}</span>

                  <Link href={`/blog/${post.slug}`} className="blogReadMore">
                    {text("Read Article", "اقرأ المقال")}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
