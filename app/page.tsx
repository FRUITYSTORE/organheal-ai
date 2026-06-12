"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealthContext } from "../lib/getHealthContext";

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [heroQuestion, setHeroQuestion] = useState("");
  const [heroAnswer, setHeroAnswer] = useState("");
  const [heroLoading, setHeroLoading] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "OrganHeal AI",
    description:
      "AI-powered personal health intelligence platform for organ assessments, lab interpretation, wellness tracking, and professional health reports.",
    url: "https://organheal.com",
    publisher: {
      "@type": "Organization",
      name: "OrganHeal AI",
      url: "https://organheal.com",
    },
  };

  async function askHeroAI() {
    if (!heroQuestion.trim() || heroLoading) return;

    setHeroLoading(true);
    setHeroAnswer("");

    try {
      const context = await getHealthContext(isArabic);

      const result = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: heroQuestion,
          language,
          healthContext: context,
        }),
      });

      const data = await result.json();

      setHeroAnswer(
        data.response ||
          (isArabic
            ? "لم أستطع إنشاء إجابة الآن."
            : "I could not generate an answer right now.")
      );
    } catch {
      setHeroAnswer(
        isArabic
          ? "حدث خطأ مؤقت أثناء الاتصال بالمساعد."
          : "A temporary error occurred while connecting to the assistant."
      );
    } finally {
      setHeroLoading(false);
    }
  }

  return (
    <main className="homepage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="homeHeroClean">
        <div className="homeHeroCleanInner">
          <div className="homeHeroCleanContent">
            <p className="homeBadge">
              {isArabic
                ? "نظام ذكاء صحي شخصي"
                : "Personal Health Intelligence System"}
            </p>

            <h1>
              {isArabic
                ? "افهم صحتك بوضوح. اعرف خطوتك التالية."
                : "Understand your health clearly. Know your next step."}
            </h1>

            <p className="homeHeroCleanText">
              {isArabic
                ? "حوّل التقييمات الصحية، نتائج المختبر، التسجيل اليومي، والتاريخ الصحي إلى ذكاء صحي واضح يساعدك على فهم المخاطر والفرص والخطوة التالية."
                : "Turn health assessments, lab results, daily wellness tracking, and health history into clear intelligence about risks, opportunities, and your next best action."}
            </p>

            <div className="homeHeroSearchBox">
              <input
                type="text"
                value={heroQuestion}
                onChange={(event) => setHeroQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") askHeroAI();
                }}
                placeholder={
                  isArabic
                    ? "اسأل عن الكوليسترول، النوم، الكبد، القلب..."
                    : "Ask about cholesterol, sleep, liver, heart health..."
                }
              />

              <button
                className="primaryBtn"
                onClick={askHeroAI}
                disabled={heroLoading}
              >
                {heroLoading ? "..." : isArabic ? "اسأل الذكاء الصحي" : "Ask AI"}
              </button>

              <Link href="/lab-upload" className="secondaryBtn">
                {isArabic ? "رفع ملف" : "Upload File"}
              </Link>
            </div>

            {heroAnswer && (
              <div className="homeHeroAIAnswer">
                <p>{heroAnswer}</p>

                <Link href="/assistant" className="secondaryBtn">
                  {isArabic ? "متابعة في المساعد" : "Continue in Assistant"}
                </Link>
              </div>
            )}

            <div className="homeHeroCleanActions">
              <Link href="/assessment" className="primaryBtn">
                {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
              </Link>

              <Link href="/intelligence" className="secondaryBtn">
                {isArabic ? "شاهد مركز الذكاء" : "View Intelligence Center"}
              </Link>

              <Link href="/login" className="secondaryBtn">
                {isArabic ? "تسجيل الدخول" : "Sign In"}
              </Link>
            </div>

            <p className="homeHeroDisclaimer">
              {isArabic
                ? "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل الطبيب أو التشخيص الطبي."
                : "OrganHeal provides educational health intelligence and does not replace medical diagnosis or licensed care."}
            </p>
          </div>
        </div>
      </section>

      {/* اترك باقي الأقسام كما هي عندك من How It Works وما بعدها */}
    </main>
  );
}