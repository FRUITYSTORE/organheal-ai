"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageLayout from "@/app/components/navigation/PageLayout";
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

  useEffect(() => {
    setSelectedCategory("all");
    setSelectedMarker("all");
  }, [language]);

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

        .healthArticlesPage .articleCompactHero {
          padding: 40px;
        }

        .healthArticlesPage .articleCompactHero .ohHeroGrid {
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.55fr);
          align-items: center;
        }

        .healthArticlesPage .articleCompactHero .ohTitle {
          max-width: 820px;
          font-size: clamp(2.35rem, 4.5vw, 4.35rem);
          line-height: 0.98;
        }

        .healthArticlesPage .articleCompactHero .ohLead {
          max-width: 760px;
        }

        .healthArticlesPage .articleHeroSummary {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.92));
          color: white;
          padding: 22px;
          min-height: 210px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
        }

        .healthArticlesPage .articleHeroSummary::after {
          content: "";
          position: absolute;
          width: 210px;
          height: 210px;
          right: -72px;
          bottom: -90px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.48), transparent 66%);
          pointer-events: none;
        }

        [dir="rtl"] .healthArticlesPage .articleHeroSummary::after {
          right: auto;
          left: -72px;
        }

        .healthArticlesPage .articleHeroSummaryLabel {
          position: relative;
          z-index: 1;
          margin: 0;
          color: rgba(209, 250, 229, 0.88);
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthArticlesPage .articleHeroSummaryValue {
          position: relative;
          z-index: 1;
          display: block;
          margin-top: 14px;
          font-size: 3.2rem;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .healthArticlesPage .articleHeroSummaryText {
          position: relative;
          z-index: 1;
          margin: 14px 0 0;
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.7;
          font-weight: 650;
        }

        .healthArticlesPage .articleSearchPanel {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(15, 118, 110, 0.18);
          background:
            radial-gradient(circle at 12% 22%, rgba(20, 184, 166, 0.22), transparent 28%),
            linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 255, 255, 0.96));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 24px;
        }

        .healthArticlesPage .articleSearchHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .healthArticlesPage .articleSearchTitle {
          margin: 0;
          color: var(--oh-text);
          font-size: 1.45rem;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .healthArticlesPage .articleSearchText {
          margin: 8px 0 0;
          color: var(--oh-muted);
          line-height: 1.7;
        }

        .healthArticlesPage .articleControlGrid {
          display: grid;
          grid-template-columns: minmax(280px, 1.4fr) minmax(180px, 0.7fr) minmax(180px, 0.7fr) auto;
          gap: 12px;
          align-items: center;
        }

        .healthArticlesPage .articleSearchInputWrap {
          position: relative;
        }

        .healthArticlesPage .articleSearchIcon {
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.12);
          color: #0f766e;
          font-weight: 950;
          pointer-events: none;
        }

        [dir="rtl"] .healthArticlesPage .articleSearchIcon {
          left: auto;
          right: 16px;
        }

        .healthArticlesPage .articleControl {
          width: 100%;
          min-height: 56px;
          border: 1px solid rgba(15, 118, 110, 0.26);
          border-radius: 16px;
          padding: 13px 15px;
          background: rgba(255, 255, 255, 0.98);
          color: var(--oh-text);
          font: inherit;
          font-weight: 850;
          outline: none;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .healthArticlesPage .articleSearchInput {
          padding-inline-start: 58px;
        }

        [dir="rtl"] .healthArticlesPage .articleSearchInput {
          padding-inline-start: 15px;
          padding-inline-end: 58px;
        }

        .healthArticlesPage .articleControl:focus {
          border-color: rgba(20, 184, 166, 0.78);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
        }

        .healthArticlesPage .articleClearButton {
          min-height: 56px;
          padding: 0 18px;
          border-radius: 16px;
          border: 1px solid rgba(15, 118, 110, 0.26);
          background: rgba(15, 23, 42, 0.94);
          color: white;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
        }

        .healthArticlesPage .articleClearButton:hover {
          transform: translateY(-1px);
        }

        .healthArticlesPage .articleQuickFilterRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .healthArticlesPage .articleQuickFilter {
          border: 1px solid rgba(15, 118, 110, 0.22);
          background: rgba(255, 255, 255, 0.84);
          color: #0f766e;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 0.84rem;
          font-weight: 900;
          cursor: pointer;
        }

        .healthArticlesPage .articleQuickFilter.active {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
          box-shadow: 0 12px 26px rgba(15, 118, 110, 0.18);
        }

        .healthArticlesPage .articleResultsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .healthArticlesPage .articleResultsTitle {
          margin: 0;
          color: var(--oh-text);
          font-size: 1.35rem;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .healthArticlesPage .articleGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .healthArticlesPage .articleCard {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          overflow: hidden;
          border-top: 5px solid #14b8a6;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .healthArticlesPage .articleCard:hover {
          transform: translateY(-4px);
          border-color: rgba(20, 184, 166, 0.48);
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
        }

        .healthArticlesPage .articleCategory {
          width: fit-content;
          margin: 0;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.12);
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.05em;
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
          background: rgba(248, 250, 252, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: var(--oh-muted);
          font-size: 0.78rem;
          font-weight: 850;
        }

        .healthArticlesPage .articleCardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }

        .healthArticlesPage .articleDate {
          color: var(--oh-muted);
          font-size: 0.88rem;
          font-weight: 850;
        }

        .healthArticlesPage .articleReadMore {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-size: 0.9rem;
          font-weight: 950;
          box-shadow: 0 12px 24px rgba(15, 118, 110, 0.16);
        }

        .healthArticlesPage .articleSafetyStrip {
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

        .healthArticlesPage .articleSafetyStrip strong {
          color: var(--oh-text);
        }

        .healthArticlesPage .articleSafetyMark {
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

        .healthArticlesPage .articleEmptyState {
          text-align: center;
          padding: 34px;
        }

        @media (max-width: 1080px) {
          .healthArticlesPage .articleControlGrid {
            grid-template-columns: 1fr 1fr;
          }

          .healthArticlesPage .articleSearchInputWrap {
            grid-column: 1 / -1;
          }

          .healthArticlesPage .articleClearButton {
            width: 100%;
          }
        }

        @media (max-width: 980px) {
          .healthArticlesPage .articleCompactHero .ohHeroGrid {
            grid-template-columns: 1fr;
          }

          .healthArticlesPage .articleGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .healthArticlesPage .articleCompactHero {
            padding: 28px;
          }

          .healthArticlesPage .articleCompactHero .ohTitle {
            font-size: clamp(2.1rem, 11vw, 3rem);
          }

          .healthArticlesPage .articleSearchHeader,
          .healthArticlesPage .articleResultsHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .healthArticlesPage .articleControlGrid,
          .healthArticlesPage .articleGrid {
            grid-template-columns: 1fr;
          }

          .healthArticlesPage .articleCardFooter {
            align-items: flex-start;
            flex-direction: column;
          }

          .healthArticlesPage .articleReadMore {
            width: 100%;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero articleCompactHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Health Article Library", "مكتبة المقالات الصحية")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Search health articles with clarity.",
                  "ابحث في المقالات الصحية بوضوح."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Find patient-friendly explanations by health area, lab marker, organ system, or preparation topic.",
                  "اعثر على شروحات مبسطة حسب المجال الصحي أو مؤشر المختبر أو العضو أو موضوع التحضير."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "22px" }}>
                <Link href="/library" className="secondaryBtn">
                  {text("Back to Health Learning Hub", "العودة إلى مركز التعلّم الصحي")}
                </Link>
              </div>
            </div>

            <aside className="articleHeroSummary">
              <p className="articleHeroSummaryLabel">
                {text("Available collection", "المجموعة المتاحة")}
              </p>

              <span className="articleHeroSummaryValue">{blogPosts.length}</span>

              <p className="articleHeroSummaryText">
                {text(
                  "Structured articles connected to health areas and lab markers.",
                  "مقالات منظمة ومرتبطة بالمجالات الصحية ومؤشرات المختبر."
                )}
              </p>
            </aside>
          </div>
        </section>

        <section className="articleSearchPanel">
          <div className="articleSearchHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Guided article discovery", "اكتشاف المقالات الموجّه")}
              </p>

              <h2 className="articleSearchTitle">
                {text(
                  "Search by marker, organ system, or health question.",
                  "ابحث حسب المؤشر أو العضو أو السؤال الصحي."
                )}
              </h2>

              <p className="articleSearchText">
                {text(
                  "The search area is the main action on this page. Use it to narrow the live article collection quickly.",
                  "منطقة البحث هي الإجراء الأساسي هنا. استخدمها لتضييق مجموعة المقالات المتاحة بسرعة."
                )}
              </p>
            </div>

            <span className="ohStatusBadge good">
              {text("Live articles", "مقالات متاحة")}
            </span>
          </div>

          <div className="articleControlGrid">
            <div className="articleSearchInputWrap">
              <span className="articleSearchIcon">⌕</span>
              <input
                className="articleControl articleSearchInput"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={text(
                  "Search LDL, kidney, sleep, blood pressure...",
                  "ابحث عن LDL، الكلى، النوم، ضغط الدم..."
                )}
              />
            </div>

            <select
              className="articleControl"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label={text("Filter by health area", "فلترة حسب المجال الصحي")}
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

            <button type="button" className="articleClearButton" onClick={resetFilters}>
              {text("Clear", "مسح")}
            </button>
          </div>

          <div className="articleQuickFilterRow">
            <button
              type="button"
              className={`articleQuickFilter ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              {text("All", "الكل")}
            </button>

            {categoryOptions.map((category) => (
              <button
                type="button"
                className={`articleQuickFilter ${selectedCategory === category ? "active" : ""}`}
                onClick={() => setSelectedCategory(category)}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Article collection", "مجموعة المقالات")}
            </span>
            <span className="ohMetricValue">{blogPosts.length}</span>
            <span className="ohMetricHint">
              {text("Available learning items", "مواد تعليمية متاحة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Current matches", "النتائج الحالية")}
            </span>
            <span className="ohMetricValue">{filteredPosts.length}</span>
            <span className="ohMetricHint">
              {text("Based on search and filters", "حسب البحث والفلاتر")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Lab marker index", "فهرس المؤشرات")}
            </span>
            <span className="ohMetricValue">{markerOptions.length}</span>
            <span className="ohMetricHint">
              {text("Connected markers", "مؤشرات مرتبطة")}
            </span>
          </article>
        </section>

        <section className="articleSafetyStrip">
          <span className="articleSafetyMark">OH</span>
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

        <section>
          <div className="articleResultsHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Article results", "نتائج المقالات")}
              </p>

              <h2 className="articleResultsTitle">
                {text(
                  `${filteredPosts.length} articles found`,
                  `تم العثور على ${filteredPosts.length} مقالات`
                )}
              </h2>
            </div>

            {(searchTerm || selectedCategory !== "all" || selectedMarker !== "all") && (
              <button type="button" className="articleQuickFilter active" onClick={resetFilters}>
                {text("Reset all filters", "إعادة ضبط الفلاتر")}
              </button>
            )}
          </div>

          {filteredPosts.length > 0 ? (
            <div className="articleGrid">
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

                    <h3 className="ohCardTitle" style={{ fontSize: "1.16rem" }}>
                      {title}
                    </h3>

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
            </div>
          ) : (
            <div className="ohCard articleEmptyState">
              <p className="ohMetricLabel">
                {text("No matching articles", "لا توجد مقالات مطابقة")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Try a broader search or clear the filters.",
                  "جرّب بحثًا أوسع أو امسح الفلاتر."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The collection only shows available educational content.",
                  "المجموعة تعرض فقط المحتوى التعليمي المتاح."
                )}
              </p>

              <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "18px" }}>
                <button type="button" className="primaryBtn" onClick={resetFilters}>
                  {text("Clear Filters", "مسح الفلاتر")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


