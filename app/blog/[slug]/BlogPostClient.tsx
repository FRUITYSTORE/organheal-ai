"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blogPosts } from "../../../lib/blogData";

type Language = "en" | "ar";

type BlogPost = (typeof blogPosts)[0];

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: isArabic ? post.titleAr : post.title,
    description: isArabic ? post.excerptAr : post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://organheal.com/blog/${post.slug}`,
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
        url: "https://organheal.com/icon.svg",
      },
    },
  };

  return (
    <main className="assistantPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
<Link
  href="/blog"
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "22px",
    textDecoration: "none",
    color: "inherit",
    opacity: 0.82,
    fontWeight: 600,
  }}
>
  {isArabic ? "العودة إلى المدونة" : "← Back to Blog"}
</Link>
      <div className="assistantContainer">
        <article className="resultBox">
          <p className="sectionLabel">
            {isArabic ? post.categoryAr : post.category}
          </p>

          <h1>{isArabic ? post.titleAr : post.title}</h1>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "24px",
            }}
          >
            {post.date}
          </p>

          <div
            style={{
              lineHeight: "1.9",
              fontSize: "1.05rem",
              whiteSpace: "pre-line",
              textAlign: isArabic ? "right" : "left",
            }}
          >
            {isArabic ? post.contentAr : post.content}
          </div>
          <div
  className="resultBox"
  style={{
    marginTop: "28px",
    border: "1px solid rgba(148,163,184,0.24)",
  }}
>
  <p className="sectionLabel">
    {isArabic ? "السلامة الطبية" : "MEDICAL SAFETY"}
  </p>

  <h2>{isArabic ? "معلومة مهمة" : "Important note"}</h2>

  <p
    style={{
      opacity: 0.82,
      lineHeight: 1.8,
      margin: 0,
    }}
  >
    {isArabic
      ? "مقالات OrganHeal تعليمية فقط. لا تقدم تشخيصًا أو علاجًا ولا تستبدل الطبيب أو الرعاية الطبية المرخصة. في حال وجود أعراض شديدة أو طارئة، اطلب الرعاية الطبية فورًا."
      : "OrganHeal articles are for education only. They do not diagnose, treat, or replace licensed medical care. For severe or urgent symptoms, seek medical care immediately."}
  </p>
</div>
        </article>
      </div>
    </main>
  );
}