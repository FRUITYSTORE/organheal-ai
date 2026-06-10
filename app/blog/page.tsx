"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blogPosts } from "../../lib/blogData";

type Language = "en" | "ar";

export default function BlogPage() {
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

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "مدونة OrganHeal" : "ORGANHEAL BLOG"}
          </p>

          <h1>
            {isArabic ? "مقالات الذكاء الصحي" : "Health Intelligence Articles"}
          </h1>

          <p>
            {isArabic
              ? "تعرّف على صحة الأعضاء، نتائج المختبر، تتبع العافية، والوقاية الصحية من خلال مقالات تعليمية مبسطة."
              : "Learn about organ health, lab results, wellness tracking, and preventive health insights through simple educational articles."}
          </p>
        </section>

        <section className="chatWindow">
          <div className="blogGrid">
            {blogPosts.map((post) => (
              <article key={post.slug} className="blogCard">
                <p className="blogCategory">
                  {isArabic ? post.categoryAr : post.category}
                </p>

                <h2>{isArabic ? post.titleAr : post.title}</h2>

                <p>{isArabic ? post.excerptAr : post.excerpt}</p>

                <div className="blogCardFooter">
                  <span>{post.date}</span>

                  <Link href={`/blog/${post.slug}`} className="blogReadMore">
                    {isArabic ? "اقرأ المقال" : "Read Article"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}