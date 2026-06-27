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
    ? "حوّل التقييمات الصحية والتقارير الطبية ونتائج المختبر إلى ملخصات مفهومة للمريض، تقارير جاهزة للطبيب، وذكاء صحي واضح يساعدك على معرفة الخطوة التالية."
    : "Turn health assessments, medical reports, and lab results into patient-friendly summaries, doctor-ready briefs, and clear health intelligence for your next step."}
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

            <p className="homeHeroDisclaimer">
              {isArabic
                ? "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل الطبيب أو التشخيص الطبي."
                : "OrganHeal provides educational health intelligence and does not replace medical diagnosis or licensed care."}
            </p>
          </div>
                </div>
      </section>

      <section
        style={{
          maxWidth: "1180px",
          margin: "18px auto 0",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              icon: "🧠",
              title: isArabic
                ? "ذكاء صحي تعليمي"
                : "Educational Health Intelligence",
              text: isArabic
                ? "يساعدك على الفهم والتحضير، ولا يستبدل الطبيب."
                : "Designed to help you understand and prepare, not replace doctors.",
            },
            {
              icon: "👤",
              title: isArabic
                ? "تقارير مفهومة للمريض"
                : "Patient-Friendly Reports",
              text: isArabic
                ? "ملخصات سهلة تساعدك على فهم معلوماتك الصحية."
                : "Simple summaries that make health information easier to understand.",
            },
            {
              icon: "🩺",
              title: isArabic
                ? "ملخصات جاهزة للطبيب"
                : "Doctor-Ready Briefs",
              text: isArabic
                ? "تنظيم واضح يساعدك على مناقشة النتائج مع الطبيب."
                : "Structured briefs to support better conversations with clinicians.",
            },
            {
              icon: "🔒",
              title: isArabic ? "بيانات صحية خاصة" : "Private Health Data",
              text: isArabic
                ? "تقاريرك ونتائجك تبقى ضمن حسابك الصحي."
                : "Your reports and results stay connected to your own account.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                padding: "16px",
                borderRadius: "18px",
                background: "rgba(15,23,42,0.72)",
                border: "1px solid rgba(34,211,238,0.18)",
                textAlign: isArabic ? "right" : "left",
              }}
            >
              <div style={{ fontSize: "1.35rem", marginBottom: "8px" }}>
                {item.icon}
              </div>

              <h3 style={{ marginBottom: "6px", fontSize: "1rem" }}>
                {item.title}
              </h3>

              <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.55 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {!isLoggedIn && (
        <section className="onboardingBanner">
          <div className="onboardingContent">
            <p className="bannerLabel">
              {isArabic ? "ذكاء صحي شخصي" : "PERSONAL HEALTH INTELLIGENCE"}
            </p>

            <h2>
              {isArabic
                ? "ابنِ ملفك الصحي الكامل"
                : "Build Your Complete Health Profile"}
            </h2>

            <p>
              {isArabic
                ? "أنشئ حسابًا مجانيًا لحفظ تقاريرك، متابعة تقييماتك الصحية، والوصول إلى مركز الذكاء الصحي الخاص بك."
                : "Create a free account to save your reports, track assessments, and access your personal Health Intelligence Center."}
            </p>

            <div className="bannerFeatures">
              <span>
                {isArabic ? "✓ تحليل التقارير الطبية" : "✓ Medical Report Analysis"}
              </span>
              <span>
                {isArabic ? "✓ تقييم صحة الأعضاء" : "✓ Organ Health Assessments"}
              </span>
              <span>
                {isArabic ? "✓ رؤى صحية بالذكاء الاصطناعي" : "✓ AI Health Insights"}
              </span>
              <span>
                {isArabic ? "✓ لوحة صحية آمنة" : "✓ Secure Health Dashboard"}
              </span>
            </div>

            <div className="bannerButtons">
              <Link href="/signup">
                <button type="button">Create Free Account</button>
              </Link>

              <Link href="/login">
                <button type="button" className="secondary">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

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