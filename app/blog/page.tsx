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

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export default function BlogPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMarker, setSelectedMarker] = useState("all");

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

  function getTitle(post: BlogPost) {
    return isArabic ? post.titleAr : post.title;
  }

  function getExcerpt(post: BlogPost) {
    return isArabic ? post.excerptAr : post.excerpt;
  }

  function getCategory(post: BlogPost) {
    return isArabic ? post.categoryAr : post.category;
  }

  function getOrganSystem(post: BlogPost) {
    return isArabic ? post.organSystemAr : post.organSystem;
  }

  function getReadTime(post: BlogPost) {
    return isArabic ? post.readTimeAr : post.readTime;
  }

  const categoryOptions = useMemo(() => {
    return getUniqueValues(
      blogPosts.map((post) => (isArabic ? post.categoryAr : post.category))
    );
  }, [isArabic]);

  const markerOptions = useMemo(() => {
    return getUniqueValues(blogPosts.flatMap((post) => post.labMarkers));
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return blogPosts.filter((post) => {
      const title = getTitle(post).toLowerCase();
      const excerpt = getExcerpt(post).toLowerCase();
      const category = getCategory(post);
      const organSystem = getOrganSystem(post).toLowerCase();
      const markerText = post.labMarkers.join(" ").toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        excerpt.includes(normalizedSearch) ||
        category.toLowerCase().includes(normalizedSearch) ||
        organSystem.includes(normalizedSearch) ||
        markerText.includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "all" || category === selectedCategory;

      const matchesMarker =
        selectedMarker === "all" || post.labMarkers.includes(selectedMarker);

      return matchesSearch && matchesCategory && matchesMarker;
    });
  }, [searchTerm, selectedCategory, selectedMarker, isArabic]);

  function resetFilters() {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedMarker("all");
  }

  return (
    <main
      className="ohPageShell healthArticlesPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .healthArticlesPage,
        .healthArticlesPage * {
          box-sizing: border-box;
        }

        .healthArticlesPage a {
          color: inherit;
          text-decoration: none;
        }

        .healthArticlesPage .articleDiscoveryPanel {
          position: relative;
          overflow: hidden;
        }

        .healthArticlesPage .articleDiscoveryPanel::before {
          content: "";
          position: absolute;
          inset: -90px -90px auto auto;
          width: 240px;
          height: 240px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.16), transparent 68%);
          pointer-events: none;
        }

        .healthArticlesPage .articleControlGrid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.2fr 0.9fr 0.9fr;
          gap: 14px;
          margin-top: 20px;
        }

        .healthArticlesPage .articleControl {
          width: 100%;
          min-height: 48px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.95);
          color: var(--oh-text);
          font: inherit;
          font-weight: 750;
          outline: none;
        }

        .healthArticlesPage .articleControl:focus {
          border-color: rgba(20, 184, 166, 0.65);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .healthArticlesPage .articleGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .healthArticlesPage .articleCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .healthArticlesPage .articleCard:hover {
          transform: translateY(-3px);
          border-color: rgba(20, 184, 166, 0.34);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .healthArticlesPage .articleCategory {
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

        .healthArticlesPage .articleExcerpt {
          flex: 1;
        }

        .healthArticlesPage .articleMetaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .healthArticlesPage .articleMarkerRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .healthArticlesPage .articleMarker {
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

        .healthArticlesPage .articleCardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.22);
        }

        .healthArticlesPage .articleDate {
          color: var(--oh-muted);
          font-size: 0.88rem;
          font-weight: 800;
        }

        .healthArticlesPage .articleReadMore {
          color: #0f766e;
          font-weight: 900;
        }

        .healthArticlesPage .articleEmptyState {
          text-align: center;
          padding: 34px;
        }

        @media (max-width: 980px) {
          .healthArticlesPage .articleGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .healthArticlesPage .articleControlGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .healthArticlesPage .articleGrid {
            grid-template-columns: 1fr;
          }

          .healthArticlesPage .articleCardFooter {
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
                {text("Health Article Collection", "مجموعة المقالات الصحية")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Find the right health article by topic, marker, or question.",
                  "اعثر على المقال الصحي المناسب حسب الموضوع أو المؤشر أو السؤال."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Browse OrganHeal articles built for patient-friendly understanding of lab markers, organ health, reports, prevention, and safer doctor preparation.",
                  "تصفح مقالات OrganHeal المصممة لفهم مبسط للمريض حول مؤشرات المختبر، صحة الأعضاء، التقارير، الوقاية، والتحضير الآمن للطبيب."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/library" className="primaryBtn">
                  {text("Back to Health Learning Hub", "العودة إلى مركز التعلّم الصحي")}
                </Link>
              </div>
            </div>

            <aside className="ohCard articleDiscoveryPanel">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Guided article discovery", "اكتشاف المقالات الموجّه")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Search live educational content.",
                      "ابحث داخل المحتوى التعليمي المتاح."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Available now", "متاح الآن")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Use search and filters to narrow articles by health area or lab marker without leaving the learning experience.",
                  "استخدم البحث والفلاتر لتحديد المقالات حسب المجال الصحي أو مؤشر المختبر بدون الخروج من تجربة التعلّم."
                )}
              </p>

              <div className="articleControlGrid">
                <input
                  className="articleControl"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={text(
                    "Search articles, markers, or topics...",
                    "ابحث في المقالات أو المؤشرات أو المواضيع..."
                  )}
                />

                <select
                  className="articleControl"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  aria-label={text("Filter by health focus", "فلترة حسب المجال الصحي")}
                >
                  <option value="all">
                    {text("All health areas", "كل المجالات الصحية")}
                  </option>

                  {categoryOptions.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  className="articleControl"
                  value={selectedMarker}
                  onChange={(event) => setSelectedMarker(event.target.value)}
                  aria-label={text("Filter by lab marker", "فلترة حسب مؤشر المختبر")}
                >
                  <option value="all">
                    {text("All lab markers", "كل مؤشرات المختبر")}
                  </option>

                  {markerOptions.map((marker) => (
                    <option value={marker} key={marker}>
                      {marker}
                    </option>
                  ))}
                </select>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Available articles", "المقالات المتاحة")}
            </span>
            <span className="ohMetricValue">{blogPosts.length}</span>
            <span className="ohMetricHint">
              {text("Patient-friendly learning items", "مواد تعليمية مبسطة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Search results", "نتائج البحث")}
            </span>
            <span className="ohMetricValue">{filteredPosts.length}</span>
            <span className="ohMetricHint">
              {text("Matching current filters", "مطابقة للفلاتر الحالية")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Marker filters", "فلاتر المؤشرات")}
            </span>
            <span className="ohMetricValue">{markerOptions.length}</span>
            <span className="ohMetricHint">
              {text("Connected lab markers", "مؤشرات مختبر مرتبطة")}
            </span>
          </article>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">OH</span>
          <div>
            <strong>
              {text("Educational content only", "محتوى تعليمي فقط")}
            </strong>
            <br />
            {text(
              "Articles support learning and better doctor questions. They do not diagnose, treat, prescribe, or replace licensed medical care.",
              "المقالات تدعم التعلّم وتحضير أسئلة أفضل للطبيب. لا تقدم تشخيصًا أو علاجًا أو وصفات ولا تستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        {filteredPosts.length > 0 ? (
          <section className="articleGrid">
            {filteredPosts.map((post) => {
              const title = getTitle(post);
              const excerpt = getExcerpt(post);
              const category = getCategory(post);
              const organSystem = getOrganSystem(post);
              const readTime = getReadTime(post);

              return (
                <article key={post.slug} className="ohCard articleCard">
                  <div className="articleMetaRow">
                    <p className="articleCategory">{category}</p>
                    <span className="ohStatusBadge neutral">{readTime}</span>
                  </div>

                  <h2 className="ohCardTitle">{title}</h2>

                  <p className="ohCardText articleExcerpt">{excerpt}</p>

                  <div className="articleMarkerRow">
                    <span className="articleMarker">{organSystem}</span>

                    {post.labMarkers.slice(0, 3).map((marker) => (
                      <span className="articleMarker" key={`${post.slug}-${marker}`}>
                        {marker}
                      </span>
                    ))}
                  </div>

                  <div className="articleCardFooter">
                    <span className="articleDate">{post.date}</span>

                    <Link href={`/blog/${post.slug}`} className="articleReadMore">
                      {text("Read Article", "اقرأ المقال")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="ohCard articleEmptyState">
            <p className="ohMetricLabel">
              {text("No matching articles", "لا توجد مقالات مطابقة")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Try adjusting your search or filters.",
                "جرّب تعديل البحث أو الفلاتر."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The article collection is focused on available educational content. Clear the filters to view all articles.",
                "مجموعة المقالات تركز على المحتوى التعليمي المتاح. امسح الفلاتر لعرض كل المقالات."
              )}
            </p>

            <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "18px" }}>
              <button type="button" className="primaryBtn" onClick={resetFilters}>
                {text("Clear Filters", "مسح الفلاتر")}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
