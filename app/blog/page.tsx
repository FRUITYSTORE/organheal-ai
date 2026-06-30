"use client";

import { useEffect, useState } from "react";
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

        @media (max-width: 980px) {
          .blogCommandPage .blogGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .blogCommandPage .blogGrid {
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
                {text("OrganHeal Blog", "مدونة OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text("Health Intelligence Articles", "مقالات الذكاء الصحي")}
              </h1>

              <p className="ohLead">
                {text(
                  "Learn about organ health, lab results, wellness tracking, prevention, and practical health intelligence through simple educational articles.",
                  "تعرّف على صحة الأعضاء، نتائج المختبر، متابعة العافية، الوقاية، والذكاء الصحي العملي من خلال مقالات تعليمية مبسطة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/library" className="primaryBtn">
                  {text("Open Library", "فتح المكتبة")}
                </Link>

                <Link href="/assessment" className="secondaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Dashboard", "لوحة التحكم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Education hub", "مركز التثقيف")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      `${blogPosts.length} articles available`,
                      `${blogPosts.length} مقالات متوفرة`
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Use these articles to build health awareness before reviewing your reports, assessments, or doctor questions.",
                  "استخدم هذه المقالات لبناء وعي صحي قبل مراجعة تقاريرك أو تقييماتك أو أسئلتك للطبيب."
                )}
              </p>
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
              "Articles are for general health education and do not replace licensed medical advice, diagnosis, or treatment.",
              "المقالات للتثقيف الصحي العام ولا تستبدل الاستشارة أو التشخيص أو العلاج من مختص صحي مرخص."
            )}
          </div>
        </section>

        <section className="blogGrid">
          {blogPosts.map((post) => (
            <article key={post.slug} className="ohCard blogCard">
              <p className="blogCategory">
                {isArabic ? post.categoryAr : post.category}
              </p>

              <h2 className="ohCardTitle">
                {isArabic ? post.titleAr : post.title}
              </h2>

              <p className="ohCardText blogExcerpt">
                {isArabic ? post.excerptAr : post.excerpt}
              </p>

              <div className="blogCardFooter">
                <span className="blogDate">{post.date}</span>

                <Link href={`/blog/${post.slug}`} className="blogReadMore">
                  {text("Read Article", "اقرأ المقال")}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("From reading to action", "من القراءة إلى التطبيق")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Turn education into a practical health journey.",
                  "حوّل التثقيف إلى رحلة صحية عملية."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "After reading, continue with an assessment, upload a report, or use the Health Intelligence Center for clearer next steps.",
                  "بعد القراءة، أكمل بتقييم صحي، ارفع تقريرًا، أو استخدم مركز الذكاء الصحي للحصول على خطوات أوضح."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/lab-upload" className="primaryBtn">
                {text("Upload Report", "رفع تقرير")}
              </Link>

              <Link href="/intelligence" className="secondaryBtn">
                {text("Intelligence Center", "مركز الذكاء")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
