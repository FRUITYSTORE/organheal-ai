"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PremiumBadge from "./components/PremiumBadge";
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
                {heroLoading ? "..." : isArabic ? "اسأل الذكاء الصحي" : "Open Intelligence"}
              </button>
            </div>

            {heroAnswer && (
              <div className="homeHeroAIAnswer">
                <p className="sectionLabel">
                  {isArabic ? "رؤية الذكاء الصحي" : "Quick AI Insight"}
                </p>

                <p>{heroAnswer}</p>

                <div className="homeHeroAIActions">
                  <Link href="/intelligence" className="primaryBtn">
                    {isArabic ? "متابعة في المساعد" : "Continue in Intelligence"}
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

  <Link href="/lab-upload">
  {isArabic ? "رفع التقارير الطبية" : "Upload Medical Reports"}
</Link>

<Link href="/reports">
  {isArabic ? "مكتبة التقارير" : "Reports Library"}
</Link>

<Link href="/intelligence">
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
    ? "أربع خطوات لفهم صحتك بوضوح"
    : "Four steps to clearer health intelligence"}
</h2>

<p>
  {isArabic
    ? "ابدأ بتقييم صحي، ارفع تقاريرك الطبية، احصل على ذكاء صحي منظم، ثم حمّل ملخصًا مبسطًا للمريض أو تقريرًا جاهزًا للطبيب."
    : "Start with an assessment, upload your medical reports, receive organized health intelligence, then download a patient-friendly or doctor-ready PDF."}
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
          <Link href="/intelligence" className="howStepCard">
  <span>04</span>
  <div className="howIcon">📥</div>
  <h3>
    {isArabic
      ? "حمّل ملخصات PDF"
      : "Download PDF Summaries"}
  </h3>
  <p>
    {isArabic
      ? "احصل على نسخة مبسطة للمريض وملخص جاهز للطبيب لمراجعة النتائج بشكل أوضح."
      : "Download a patient-friendly report and a doctor-ready brief to review your results more clearly."}
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
      <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "لماذا OrganHeal AI؟" : "Why OrganHeal AI"}
          </p>

          <h2>
            {isArabic
              ? "ليس مجرد قارئ تقارير طبية"
              : "Not just a medical report reader"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يربط التقييمات الصحية، التقارير الطبية، نتائج المختبر، ملخصات المريض، وملخص الطبيب داخل نظام ذكاء صحي شخصي واحد."
              : "OrganHeal connects health assessments, medical reports, lab results, patient-friendly summaries, and doctor-ready briefs into one personal health intelligence system."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <Link href="/intelligence" className="aiFeatureCard">
            <div>🪪</div>
            <h3>{isArabic ? "ملف صحي ذكي" : "Health Passport"}</h3>
            <p>
              {isArabic
                ? "صورة منظمة عن حالتك الصحية، الأولويات، والاتجاه العام لصحتك."
                : "A structured view of your health profile, priorities, and overall health direction."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>📈</div>
            <h3>{isArabic ? "اتجاهات ومخاطر" : "Trends & Risk Signals"}</h3>
            <p>
              {isArabic
                ? "يساعدك على ملاحظة الإشارات المتكررة والفرص الصحية المهمة."
                : "Helps surface repeated patterns, important signals, and health opportunities."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>👤</div>
            <h3>{isArabic ? "ملخص للمريض" : "Patient-Friendly PDF"}</h3>
            <p>
              {isArabic
                ? "تقرير مبسط بلغة واضحة يساعدك على فهم النتائج دون تعقيد."
                : "A simple report written in clear language to help you understand your results."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>🩺</div>
            <h3>{isArabic ? "ملخص جاهز للطبيب" : "Doctor-Ready Brief"}</h3>
            <p>
              {isArabic
                ? "ملخص منظم يساعدك على تحضير النقاش مع الطبيب بشكل أفضل."
                : "A structured brief designed to support better conversations with your doctor."}
            </p>
          </Link>

          <Link href="/assessment" className="aiFeatureCard">
            <div>🎯</div>
            <h3>{isArabic ? "فرص صحية واضحة" : "Clear Health Opportunities"}</h3>
            <p>
              {isArabic
                ? "يعرض أهم المجالات التي يمكن تحسينها بدل الاكتفاء بعرض النتائج فقط."
                : "Highlights areas that may be improved instead of only showing raw results."}
            </p>
          </Link>

          <Link href="/lab-upload" className="aiFeatureCard">
            <div>🔗</div>
            <h3>{isArabic ? "ربط البيانات الصحية" : "Connected Health Data"}</h3>
            <p>
              {isArabic
                ? "يجمع التقارير والتقييمات داخل رحلة صحية واحدة قابلة للمتابعة."
                : "Brings reports and assessments together into one trackable health journey."}
            </p>
          </Link>
        </div>
      </section>
            <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic
              ? "تقارير PDF ذكية"
              : "Reports & PDF Summaries"}
          </p>

          <h2>
            {isArabic
              ? "حوّل التقرير الطبي إلى ملخصات واضحة قابلة للتحميل"
              : "Turn medical reports into clear downloadable summaries"}
          </h2>

          <p>
            {isArabic
              ? "بعد رفع التقرير الطبي، يساعدك OrganHeal على توليد ملخص مبسط للمريض، وملخص منظم للطبيب، مع حفظ نتائج الذكاء الصحي داخل حسابك."
              : "After uploading a medical report, OrganHeal helps generate a patient-friendly summary, a doctor-ready brief, and saved intelligence results inside your account."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <Link href="/intelligence" className="aiFeatureCard">
            <div>👤</div>
            <h3>
              {isArabic
                ? "تقرير مبسط للمريض"
                : "Patient-Friendly Report"}
            </h3>
            <p>
              {isArabic
                ? "شرح واضح بلغة بسيطة يساعدك على فهم أهم النقاط دون مصطلحات معقدة."
                : "A clear explanation in simple language to help you understand the key points without confusing medical terms."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>🩺</div>
            <h3>
              {isArabic
                ? "ملخص جاهز للطبيب"
                : "Doctor-Ready Brief"}
            </h3>
            <p>
              {isArabic
                ? "ملخص منظم يجهزك لمناقشة التقرير مع الطبيب بطريقة أوضح وأكثر ترتيبًا."
                : "A structured summary that helps you discuss your report with your doctor more clearly."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>💾</div>
            <h3>
              {isArabic
                ? "نتائج محفوظة"
                : "Saved Intelligence Results"}
            </h3>
            <p>
              {isArabic
                ? "احتفظ بنتائج الذكاء الصحي وارجع إليها لاحقًا من مكتبة التقارير."
                : "Keep generated intelligence results and return to them later from your report library."}
            </p>
          </Link>

          <Link href="/lab-upload" className="aiFeatureCard">
            <div>✅</div>
            <h3>
              {isArabic
                ? "خطوات تالية أوضح"
                : "Clearer Next Steps"}
            </h3>
            <p>
              {isArabic
                ? "افهم ما الذي يحتاج انتباهًا، وما الأسئلة التي يمكن أن تناقشها مع الطبيب."
                : "Understand what may need attention and what questions you may want to discuss with your doctor."}
            </p>
          </Link>
        </div>
      </section>
            <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "مركز التثقيف الصحي" : "Education Hub Preview"}
          </p>

          <h2>
            {isArabic
              ? "تعلّم عن صحتك بلغة بسيطة وواضحة"
              : "Learn about your health in simple, clear language"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal لا يكتفي بتحليل التقارير، بل يهدف أيضًا إلى مساعدتك على فهم المصطلحات الطبية، المؤشرات المخبرية، والأسئلة المهمة التي يمكن مناقشتها مع الطبيب."
              : "OrganHeal is designed not only to analyze reports, but also to help you understand medical terms, lab markers, and the right questions to discuss with your doctor."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <div className="aiFeatureCard">
            <div>📚</div>
            <h3>{isArabic ? "مقالات صحية مبسطة" : "Simple Health Articles"}</h3>
            <p>
              {isArabic
                ? "مقالات قصيرة تشرح مواضيع مثل القلب، الكبد، الكلى، الدهون، السكر، والنوم بطريقة سهلة."
                : "Short articles explaining topics like heart health, liver, kidneys, cholesterol, glucose, and sleep in an easy way."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🎥</div>
            <h3>
              {isArabic ? "فيديوهات تعليمية قصيرة" : "Short Educational Videos"}
            </h3>
            <p>
              {isArabic
                ? "محتوى مرئي مختصر يساعد المستخدم على فهم المفاهيم الصحية بسرعة ووضوح."
                : "Short visual content to help users understand health concepts quickly and clearly."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🧪</div>
            <h3>
              {isArabic ? "شرح مؤشرات المختبر" : "Lab Marker Explanations"}
            </h3>
            <p>
              {isArabic
                ? "شرح مبسط لمعاني مؤشرات مثل LDL، HDL، HbA1c، الكرياتينين، إنزيمات الكبد، وفيتامين D."
                : "Plain explanations for markers like LDL, HDL, HbA1c, creatinine, liver enzymes, and vitamin D."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🫀</div>
            <h3>{isArabic ? "أدلة صحة الأعضاء" : "Organ Health Guides"}</h3>
            <p>
              {isArabic
                ? "دليل مبسط لفهم صحة القلب، الكبد، الكلى، الرئة، والجهاز الهضمي."
                : "Simple guides to understand heart, liver, kidney, lung, and digestive health."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>❓</div>
            <h3>
              {isArabic
                ? "أسئلة تناقشها مع طبيبك"
                : "Questions to Ask Your Doctor"}
            </h3>
            <p>
              {isArabic
                ? "اقتراح أسئلة منظمة تساعدك على الاستفادة من موعد الطبيب بشكل أفضل."
                : "Organized questions to help you get more value from your doctor visit."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🌱</div>
            <h3>
              {isArabic ? "تعليم صحي مستمر" : "Ongoing Health Learning"}
            </h3>
            <div
  className="buttons"
  style={{
    marginTop: "26px",
    justifyContent: "center",
  }}
>
  <a href="/library">
    <button className="primaryBtn">
      {isArabic ? "استكشف مركز التثقيف الصحي" : "Explore Health Education"}
    </button>
  </a>
</div>
            <p>
              {isArabic
                ? "محتوى تعليمي يمكن تطويره لاحقًا ليصبح جزءًا من الاشتراك والمتابعة الصحية."
                : "Educational content that can later become part of subscriptions and ongoing health follow-up."}
            </p>
          </div>
        </div>
      </section>
            <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic
              ? "المتابعة والتذكيرات"
              : "Follow-Up & Reminders Preview"}
          </p>

          <h2>
            {isArabic
              ? "ابقَ متصلًا برحلتك الصحية مع الوقت"
              : "Stay connected to your health journey over time"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يمكن تطويره ليذكّرك بتحديث تقييماتك، مراجعة تقاريرك، ومتابعة التغيرات الصحية المهمة بشكل دوري."
              : "OrganHeal can grow into a follow-up system that reminds you to update assessments, review reports, and track important health changes over time."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <div className="aiFeatureCard">
            <div>📅</div>
            <h3>
              {isArabic ? "تحديثات صحية شهرية" : "Monthly Health Check-Ins"}
            </h3>
            <p>
              {isArabic
                ? "تذكير المستخدم بتحديث حالته الصحية بشكل منتظم بدل الاعتماد على تقييم واحد فقط."
                : "Remind users to update their health status regularly instead of relying on a one-time assessment."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>📄</div>
            <h3>
              {isArabic
                ? "تذكير بتحديث التقارير"
                : "Report Update Reminders"}
            </h3>
            <p>
              {isArabic
                ? "تشجيع المستخدم على رفع تقارير جديدة عند توفر نتائج مختبر أو متابعة طبية جديدة."
                : "Encourage users to upload new reports when updated lab results or follow-up documents become available."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>✉️</div>
            <h3>{isArabic ? "متابعة عبر البريد" : "Email Follow-Up"}</h3>
            <p>
              {isArabic
                ? "إمكانية إرسال ملخصات وتذكيرات صحية منظمة عبر البريد الإلكتروني لاحقًا."
                : "Future ability to send organized health summaries and reminders by email."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>💬</div>
            <h3>
              {isArabic
                ? "تذكيرات بأسلوب WhatsApp"
                : "WhatsApp-Style Reminders"}
            </h3>
            <p>
              {isArabic
                ? "إمكانية مستقبلية للتواصل مع المستخدمين بأسلوب رسائل قصيرة وسهلة المتابعة."
                : "A future option for short, simple reminder-style communication that is easy to follow."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>📈</div>
            <h3>
              {isArabic ? "متابعة التقدم الصحي" : "Health Progress Tracking"}
            </h3>
            <p>
              {isArabic
                ? "مساعدة المستخدم على رؤية التغيرات بين التقييمات والتقارير مع مرور الوقت."
                : "Help users see changes between assessments and reports over time."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>⭐</div>
            <h3>
              {isArabic ? "جاهز لفكرة الاشتراك" : "Premium-Ready Value"}
            </h3>
            <p>
              {isArabic
                ? "هذا النوع من المتابعة يمكن أن يصبح جزءًا مهمًا من الاشتراك الشهري لاحقًا."
                : "This follow-up experience can become a strong part of a future monthly subscription."}
            </p>
          </div>
        </div>
      </section>
            <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic
              ? "قيمة الاشتراك"
              : "Subscription Value"}
          </p>

          <h2>
            {isArabic
              ? "ابدأ مجانًا، ثم انتقل إلى ذكاء صحي أعمق"
              : "Start free, then unlock deeper health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal Free يساعدك على تجربة التقييمات والشرح الصحي الأساسي. OrganHeal Plus مصمم للمتابعة المستمرة، حفظ النتائج، تقارير PDF، والذكاء الصحي المتقدم."
              : "OrganHeal Free helps you try basic assessments and health explanations. OrganHeal Plus is designed for ongoing follow-up, saved results, PDF reports, and advanced health intelligence."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            maxWidth: "980px",
            margin: "0 auto",
          }}
        >
          <div
            className="aiFeatureCard"
            style={{
              textAlign: isArabic ? "right" : "left",
            }}
          >
            <div>🌱</div>

            <h3>{isArabic ? "OrganHeal Free" : "OrganHeal Free"}</h3>

            <p>
              {isArabic
                ? "تجربة أساسية تساعدك على بدء فهم صحتك بطريقة آمنة وبسيطة."
                : "A basic entry experience to help you start understanding your health safely and simply."}
            </p>

            <ul
              style={{
                marginTop: "16px",
                paddingLeft: isArabic ? "0" : "18px",
                paddingRight: isArabic ? "18px" : "0",
                lineHeight: 1.8,
                opacity: 0.85,
              }}
            >
              <li>{isArabic ? "تقييم صحي أساسي" : "Basic health assessment"}</li>
              <li>{isArabic ? "مساعد صحي محدود" : "Limited Health Intelligence"}</li>
              <li>{isArabic ? "رفع محدود للتقارير" : "Limited report uploads"}</li>
              <li>{isArabic ? "شرح صحي مبسط" : "Basic health explanation"}</li>
              <li>{isArabic ? "محتوى تثقيفي أساسي" : "Basic education content"}</li>
            </ul>

            <Link
              href="/assessment"
              className="secondaryBtn"
              style={{ marginTop: "18px", display: "inline-flex" }}
            >
              {isArabic ? "ابدأ مجانًا" : "Start Free"}
            </Link>
          </div>

          <div
            className="aiFeatureCard"
            style={{
              textAlign: isArabic ? "right" : "left",
              border: "1px solid rgba(34,211,238,0.38)",
              boxShadow: "0 18px 45px rgba(34,211,238,0.08)",
            }}
          >
            <div>⭐</div>

            <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: isArabic ? "flex-end" : "flex-start",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "8px",
  }}
>
  <h3 style={{ margin: 0 }}>
    {isArabic ? "OrganHeal Plus" : "OrganHeal Plus"}
  </h3>

  <PremiumBadge label={isArabic ? "Plus" : "Plus"} />
</div>

            <p>
              {isArabic
                ? "تجربة متقدمة للمتابعة الصحية المستمرة، التقارير القابلة للتحميل، وحفظ الذكاء الصحي داخل حسابك."
                : "An advanced experience for ongoing health follow-up, downloadable reports, and saved intelligence inside your account."}
            </p>

            <ul
              style={{
                marginTop: "16px",
                paddingLeft: isArabic ? "0" : "18px",
                paddingRight: isArabic ? "18px" : "0",
                lineHeight: 1.8,
                opacity: 0.9,
              }}
            >
              <li>{isArabic ? "ذكاء صحي متقدم" : "Advanced health intelligence"}</li>
              <li>{isArabic ? "تقرير PDF مبسط للمريض" : "Patient-friendly PDF"}</li>
              <li>{isArabic ? "ملخص PDF جاهز للطبيب" : "Doctor-ready brief PDF"}</li>
              <li>{isArabic ? "حفظ نتائج الذكاء الصحي" : "Saved intelligence history"}</li>
              <li>{isArabic ? "اتجاهات وإشارات مخاطر" : "Trends and risk signals"}</li>
              <li>{isArabic ? "متابعة وتذكيرات شهرية" : "Monthly follow-up and reminders"}</li>
            </ul>

            <Link
              href="/intelligence"
              className="primaryBtn"
              style={{ marginTop: "18px", display: "inline-flex" }}
            >
              {isArabic ? "استكشف OrganHeal Plus" : "Explore OrganHeal Plus"}
            </Link>
          </div>
        </div>

       <div
  style={{
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  }}
>
  <Link href="/pricing" className="secondaryBtn">
    {isArabic ? "عرض الخطط" : "View Plans"}
  </Link>

  <Link href="/assessment" className="primaryBtn">
    {isArabic ? "ابدأ مجانًا" : "Start Free"}
  </Link>
</div>

<p
  style={{
    maxWidth: "760px",
    margin: "18px auto 0",
    textAlign: "center",
    opacity: 0.72,
    lineHeight: 1.7,
  }}
>
  {isArabic
    ? "ملاحظة: هذه المرحلة تعرض قيمة الاشتراك فقط. الدفع والقفل الفعلي للميزات سيتم بناؤه لاحقًا بعد اعتماد صفحة الخطط."
    : "Note: this stage only presents subscription value. Payments and real feature gating will be added later after the plans page is approved."}
</p>
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

