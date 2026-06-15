"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealthContext } from "../lib/getHealthContext";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [heroQuestion, setHeroQuestion] = useState("");
  const [heroAnswer, setHeroAnswer] = useState("");
  const [heroLoading, setHeroLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    checkUser();

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setIsLoggedIn(!!data.user);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.href = "/";
  }

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
                ? "حوّل التقييمات الصحية والتقارير الطبية ونتائج المختبر إلى ذكاء صحي واضح يساعدك على فهم المخاطر والفرص والخطوة التالية."
                : "Turn health assessments, medical reports, and lab results into clear intelligence about risks, opportunities, and your next best action."}
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
            </div>

            {heroAnswer && (
              <div className="homeHeroAIAnswer">
                <p className="sectionLabel">
                  {isArabic ? "رؤية الذكاء الصحي" : "Quick AI Insight"}
                </p>

                <p>{heroAnswer}</p>

                <div className="homeHeroAIActions">
                  <Link href="/assistant" className="primaryBtn">
                    {isArabic ? "متابعة في المساعد" : "Continue in Assistant"}
                  </Link>

                  <Link href="/intelligence" className="secondaryBtn">
                    {isArabic ? "مركز الذكاء" : "Open Intelligence Center"}
                  </Link>
                </div>
              </div>
            )}

            <div className="homeHeroCleanActions">
            <div className="homeHeroCleanActions">
  <Link href="/assessment" className="primaryBtn">
    {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
  </Link>

  <Link href="/lab-upload" className="secondaryBtn">
    {isArabic ? "ارفع التقارير الطبية" : "Upload Medical Reports"}
  </Link>

  <Link href="/intelligence" className="secondaryBtn">
    {isArabic ? "مركز الذكاء الصحي" : "Intelligence Center"}
  </Link>
</div>
            </div>

            <p className="homeHeroDisclaimer">
              {isArabic
                ? "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل الطبيب أو التشخيص الطبي."
                : "OrganHeal provides educational health intelligence and does not replace medical diagnosis or licensed care."}
            </p>
          </div>
        </div>
      </section>

      <section className="homeHowItWorks">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "كيف يعمل OrganHeal؟" : "How OrganHeal Works"}
          </p>

          <h2>
            {isArabic
              ? "ثلاث خطوات لفهم صحتك بوضوح"
              : "Three steps to clearer health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "ابدأ بتقييم صحي، ارفع تقاريرك الطبية، ثم احصل على ذكاء صحي منظم وواضح."
              : "Start with an assessment, upload your medical reports, and receive clear organized health intelligence."}
          </p>
        </div>

        <div className="howStepsGrid">
          <Link href="/assessment" className="howStepCard">
            <span>01</span>
            <div className="howIcon">🫀</div>
            <h3>{isArabic ? "أكمل التقييم الصحي" : "Complete Assessment"}</h3>
            <p>
              {isArabic
                ? "أجب عن أسئلة موجهة حول صحة الأعضاء ونمط الحياة."
                : "Answer guided questions about organ health and lifestyle patterns."}
            </p>
          </Link>

          <Link href="/lab-upload" className="howStepCard">
            <span>02</span>
            <div className="howIcon">📄</div>
            <h3>
              {isArabic ? "ارفع التقارير الطبية" : "Upload Medical Reports"}
            </h3>
            <p>
              {isArabic
                ? "ارفع المختبرات، تقارير الأشعة، أو التقارير الطبية المكتوبة."
                : "Upload lab results, radiology reports, or written medical documents."}
            </p>
          </Link>

          <Link href="/intelligence" className="howStepCard">
            <span>03</span>
            <div className="howIcon">🧠</div>
            <h3>{isArabic ? "احصل على الذكاء الصحي" : "Receive Intelligence"}</h3>
            <p>
              {isArabic
                ? "افهم الملف الصحي، إشارات المخاطر، الفرص، وملخص الطبيب."
                : "Understand your health profile, risk signals, opportunities, and doctor brief."}
            </p>
          </Link>
        </div>
      </section>

      <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "ذكاء التقارير الطبية" : "Medical Report Intelligence"}
          </p>

          <h2>
            {isArabic
              ? "من التقارير الطبية إلى فهم صحي واضح"
              : "From medical reports to clear health understanding"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يساعدك على تنظيم وفهم التقارير المكتوبة، دون استبدال الطبيب أو تقديم تشخيص طبي."
              : "OrganHeal helps organize and explain written reports without replacing doctors or providing medical diagnosis."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <Link href="/lab-upload" className="aiFeatureCard">
            <div>🧪</div>
            <h3>{isArabic ? "تقارير المختبر" : "Laboratory Reports"}</h3>
            <p>
              {isArabic
                ? "تحاليل الدم، CBC، الكبد، الكلى، الدهون، السكر، والفيتامينات."
                : "Blood tests, CBC, liver, kidney, lipid, glucose, and vitamin reports."}
            </p>
          </Link>

          <Link href="/lab-upload" className="aiFeatureCard">
            <div>🩻</div>
            <h3>{isArabic ? "تقارير الأشعة" : "Radiology Reports"}</h3>
            <p>
              {isArabic
                ? "شرح تقارير CT و MRI والأشعة والسونار المكتوبة، وليس تشخيص الصور الخام."
                : "Explain written CT, MRI, X-ray, and ultrasound reports, not raw image diagnosis."}
            </p>
          </Link>

          <Link href="/lab-upload" className="aiFeatureCard">
            <div>📋</div>
            <h3>{isArabic ? "التقارير الطبية" : "Medical Documents"}</h3>
            <p>
              {isArabic
                ? "تقارير خروج، ملاحظات الطبيب، الوصفات، وخطط المتابعة."
                : "Discharge summaries, doctor notes, prescriptions, and follow-up plans."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>🧠</div>
            <h3>{isArabic ? "مخرجات الذكاء الصحي" : "Health Insights"}</h3>
            <p>
              {isArabic
                ? "إشارات المخاطر، الفرص الصحية، والخطوة التالية بشكل واضح."
                : "Risk signals, health opportunities, and clear next steps."}
            </p>
          </Link>
        </div>
      </section>

      <section className="homeFinalCTA">
        <div className="homeFinalCTAContent">
          <p className="sectionLabel">
            {isArabic
              ? "ابدأ رحلتك الصحية الذكية"
              : "Start Your Health Intelligence Journey"}
          </p>

          <h2>
            {isArabic
              ? "حوّل تقاريرك وبياناتك الصحية إلى فهم واضح اليوم."
              : "Turn your reports and health data into clear understanding today."}
          </h2>

          <p>
            {isArabic
              ? "ابدأ بتقييم صحي، ارفع تقاريرك الطبية، ثم افتح مركز الذكاء الصحي."
              : "Start with an assessment, upload your medical reports, then open your Health Intelligence Center."}
          </p>

          <div className="homeFinalCTAActions">
            <Link href="/assessment" className="primaryBtn">
              {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
            </Link>

            <Link href="/lab-upload" className="secondaryBtn">
              {isArabic ? "ارفع التقارير الطبية" : "Upload Medical Reports"}
            </Link>
          </div>

          <p className="homeFooterDisclaimer">
            {isArabic
              ? "OrganHeal يشرح التقارير الطبية للتثقيف والتحضير فقط، ولا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة."
              : "OrganHeal explains medical reports for education and preparation only. It does not provide diagnosis, treatment, or emergency medical advice."}
          </p>
        </div>
      </section>
    </main>
  );
}