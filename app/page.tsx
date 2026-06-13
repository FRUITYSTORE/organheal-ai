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
  const [selectedLabFile, setSelectedLabFile] = useState<File | null>(null);

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
function handleHeroFile(file: File) {
  setSelectedLabFile(file);
}

function handleHeroDrop(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();

  const file = event.dataTransfer.files?.[0];

  if (file) {
    handleHeroFile(file);
  }
}

function handleHeroDragOver(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
}

async function analyzeHeroLabFile() {
  alert("New upload function is running");

  if (!selectedLabFile) return;

  setHeroLoading(true);

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    sessionStorage.setItem(
      "organheal-pending-lab-file-name",
      selectedLabFile.name
    );

    window.location.href = "/login";
    return;
  }

  const user = userData.user;
  const safeFileName = selectedLabFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("lab-reports")
    .upload(filePath, selectedLabFile);

 if (uploadError) {
  console.log("STORAGE ERROR:", uploadError);
  setHeroAnswer("Upload failed: " + uploadError.message);
  setHeroLoading(false);
  return;
}

  const { data: signedUrlData, error: signedUrlError } =
    await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

  if (signedUrlError) {
    setHeroAnswer("File uploaded, but preview link failed.");
    setHeroLoading(false);
    return;
  }

  const { error: databaseError } = await supabase
    .from("uploaded_lab_files")
    .insert({
      user_id: user.id,
      file_name: selectedLabFile.name,
      file_path: filePath,
      file_url: signedUrlData.signedUrl,
    });

 if (databaseError) {
  console.log("DATABASE ERROR:", databaseError);
  setHeroAnswer("Database error: " + databaseError.message);
  setHeroLoading(false);
  return;
}

  sessionStorage.setItem(
    "organheal-latest-uploaded-lab-file",
    selectedLabFile.name
  );

  window.location.href = "/lab-upload?uploaded=1";
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

            <div
  className="homeHeroSearchBox"
  onDrop={handleHeroDrop}
  onDragOver={handleHeroDragOver}
>
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

<label className="labPdfHeroBtn">
  <input
    type="file"
    accept=".pdf,image/*"
    hidden
  onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    handleHeroFile(file);
  }
}}
  />

  {selectedLabFile ? (
    <>
      <span>{selectedLabFile.name}</span>
      <small>
        {isArabic ? "جاهز للتحليل" : "Ready for analysis"}
      </small>
    </>
  ) : (
    <>
      <span>
        {isArabic
          ? "اسحب ملف المختبر أو اضغط للرفع"
          : "Drop Lab PDF or click to upload"}
      </span>

      <small>
        {isArabic ? "PDF أو صورة" : "PDF or image"}
      </small>
    </>
  )}
</label>
{selectedLabFile && (
  <button type="button" className="primaryBtn" onClick={analyzeHeroLabFile}>
  {isArabic ? "تحليل التقرير" : "Analyze Report"}
</button>
)}
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

      <section className="homeHowItWorks">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "كيف يعمل OrganHeal؟" : "How OrganHeal Works"}
          </p>

          <h2>
            {isArabic
              ? "من بيانات بسيطة إلى ذكاء صحي واضح"
              : "From simple data to clear health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "ابدأ بتقييم صحي، أضف نتائج المختبر أو التسجيل اليومي، ثم يحصل المستخدم على ملف صحي ذكي وخطوة تالية واضحة."
              : "Start with a health assessment, add labs or daily check-ins, and OrganHeal turns your data into a health profile, risk insights, and next best actions."}
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
            <div className="howIcon">🧪</div>
            <h3>{isArabic ? "أضف نتائج المختبر" : "Add Lab Results"}</h3>
            <p>
              {isArabic
                ? "أدخل أو ارفع نتائج المختبر للحصول على فهم أعمق."
                : "Enter or upload lab information for deeper educational insights."}
            </p>
          </Link>

          <Link href="/checkin" className="howStepCard">
            <span>03</span>
            <div className="howIcon">☀️</div>
            <h3>{isArabic ? "تابع صحتك اليومية" : "Track Daily Wellness"}</h3>
            <p>
              {isArabic
                ? "سجل النوم، التوتر، المزاج، الترطيب، والنشاط."
                : "Log sleep, stress, mood, hydration, and physical activity."}
            </p>
          </Link>

          <Link href="/intelligence" className="howStepCard">
            <span>04</span>
            <div className="howIcon">🧠</div>
            <h3>{isArabic ? "احصل على الذكاء الصحي" : "Receive Intelligence"}</h3>
            <p>
              {isArabic
                ? "افتح الملف الصحي، نمط المخاطر، الفرص، التوقعات، وملخص الطبيب."
                : "Get your health profile, risk pattern, opportunities, forecast, and doctor brief."}
            </p>
          </Link>
        </div>
      </section>

      <section className="homeIntelligencePreview">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "معاينة الذكاء الصحي" : "Live Intelligence Preview"}
          </p>

          <h2>
            {isArabic
              ? "ليس مجرد رقم. بل فهم صحي قابل للتنفيذ."
              : "Not just a score. Actionable health intelligence."}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يحول البيانات الصحية إلى ملف ذكي يوضح الحالة، المخاطر، الفرص، والخطوة التالية."
              : "OrganHeal transforms health data into a smart profile showing status, risks, opportunities, and the next best action."}
          </p>
        </div>

        <div className="intelligencePreviewCard">
          <div className="previewMain">
            <p className="sectionLabel">
              {isArabic ? "الملف الصحي الذكي" : "Health Intelligence Profile"}
            </p>

            <h3>{isArabic ? "ملف صحي متوازن" : "Balanced Health Profile"}</h3>

            <p>
              {isArabic
                ? "يعرض هذا المثال كيف يحلل OrganHeal التقييمات، المختبر، والتسجيل اليومي لتكوين صورة صحية واضحة."
                : "This example shows how OrganHeal interprets assessments, labs, and daily tracking into a clear health picture."}
            </p>
          </div>

          <div className="previewMetricsGrid">
            <div>
              <span>{isArabic ? "الدرجة العامة" : "Overall Score"}</span>
              <strong>82/100</strong>
            </div>

            <div>
              <span>{isArabic ? "نمط المخاطر" : "Risk Pattern"}</span>
              <strong>{isArabic ? "متابعة وقائية" : "Preventive Monitoring"}</strong>
            </div>

            <div>
              <span>{isArabic ? "فرصة التحسن" : "Potential Gain"}</span>
              <strong>+8</strong>
            </div>

            <div>
              <span>{isArabic ? "الخطوة التالية" : "Next Best Action"}</span>
              <strong>{isArabic ? "تحسين النشاط" : "Improve activity"}</strong>
            </div>
          </div>

          <div className="previewDoctorBrief">
            <p className="sectionLabel">
              {isArabic ? "ملخص الطبيب" : "Doctor-Ready Brief"}
            </p>

            <p>
              {isArabic
                ? "المستخدم لديه مؤشرات صحية مستقرة مع فرصة واضحة لتحسين النشاط اليومي والمتابعة الوقائية."
                : "The user shows stable health indicators with a clear opportunity to improve daily activity and preventive tracking."}
            </p>
          </div>
        </div>
      </section>

      <section className="homeAIFeatures">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "ميزات الذكاء الاصطناعي" : "AI Health Features"}
          </p>

          <h2>
            {isArabic
              ? "ذكاء صحي يساعدك على الفهم وليس التخمين"
              : "Health AI that helps you understand, not guess"}
          </h2>

          <p>
            {isArabic
              ? "اسأل، حلل، تتبع، وشارك ملخصًا صحيًا احترافيًا مبنيًا على بياناتك."
              : "Ask, analyze, track, and share professional health summaries built around your data."}
          </p>
        </div>

        <div className="aiFeaturesGrid">
          <Link href="/assistant" className="aiFeatureCard">
            <div>🤖</div>
            <h3>{isArabic ? "البحث الصحي الذكي" : "AI Health Search"}</h3>
            <p>
              {isArabic
                ? "اسأل عن المؤشرات، الأعضاء، المختبر، والخطوة التالية."
                : "Ask about markers, organs, labs, and your next best action."}
            </p>
          </Link>

          <Link href="/lab-upload" className="aiFeatureCard">
            <div>🧪</div>
            <h3>{isArabic ? "تحليل ملفات المختبر" : "AI Lab Interpretation"}</h3>
            <p>
              {isArabic
                ? "ارفع ملفًا أو أدخل نتائج المختبر للحصول على فهم تعليمي."
                : "Upload or enter lab results for educational interpretation."}
            </p>
          </Link>

          <Link href="/intelligence" className="aiFeatureCard">
            <div>🎯</div>
            <h3>{isArabic ? "مدرب صحي ذكي" : "AI Health Coach"}</h3>
            <p>
              {isArabic
                ? "احصل على فرص التحسين والخطوة الصحية التالية."
                : "Get improvement opportunities and your next best health action."}
            </p>
          </Link>

          <Link href="/doctor-portal" className="aiFeatureCard">
            <div>🩺</div>
            <h3>{isArabic ? "ملخص الطبيب" : "Doctor Brief Generator"}</h3>
            <p>
              {isArabic
                ? "حوّل بياناتك إلى ملخص جاهز للمراجعة الطبية."
                : "Turn your data into a doctor-ready pre-visit brief."}
            </p>
          </Link>
        </div>
      </section>

      <section className="homeOutcomes">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "النتائج التي ستحصل عليها" : "Health Outcomes"}
          </p>

          <h2>
            {isArabic
              ? "ليس مجرد بيانات صحية، بل قرارات أفضل"
              : "Not just health data. Better decisions."}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يحول التقييمات والمختبرات والتتبع اليومي إلى مخرجات صحية مفهومة وقابلة للتنفيذ."
              : "OrganHeal transforms assessments, labs, and daily tracking into actionable health outcomes."}
          </p>
        </div>

        <div className="outcomesGrid">
          <Link href="/intelligence" className="outcomeCard">
            <div className="outcomeIcon">🧬</div>
            <h3>{isArabic ? "الملف الصحي الذكي" : "Health Profile"}</h3>
            <p>
              {isArabic
                ? "اعرف نقاط القوة والفرص الصحية لديك."
                : "Understand your strongest and weakest health areas."}
            </p>
          </Link>

          <Link href="/intelligence" className="outcomeCard">
            <div className="outcomeIcon">⚠️</div>
            <h3>{isArabic ? "إشارات المخاطر" : "Risk Signals"}</h3>
            <p>
              {isArabic
                ? "اكتشف الأنماط الصحية التي تستحق المتابعة."
                : "Detect important health patterns before they become bigger issues."}
            </p>
          </Link>

          <Link href="/history" className="outcomeCard">
            <div className="outcomeIcon">📈</div>
            <h3>{isArabic ? "توقع صحي" : "90-Day Forecast"}</h3>
            <p>
              {isArabic
                ? "شاهد اتجاه صحتك خلال الفترة القادمة."
                : "See where your health trend may be heading."}
            </p>
          </Link>

          <Link href="/doctor-portal" className="outcomeCard">
            <div className="outcomeIcon">🩺</div>
            <h3>{isArabic ? "ملخص الطبيب" : "Doctor-Ready Summary"}</h3>
            <p>
              {isArabic
                ? "ادخل الموعد الطبي وأنت مستعد."
                : "Arrive prepared for healthcare conversations."}
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
              ? "حوّل بياناتك الصحية إلى خطوة واضحة اليوم."
              : "Turn your health data into a clear next step today."}
          </h2>

          <p>
            {isArabic
              ? "ابدأ بتقييم مجاني، ثم افتح ملفك الصحي الذكي، فرص التحسين، والتقرير الاحترافي."
              : "Start with a free assessment, then unlock your health profile, improvement opportunities, and professional report."}
          </p>

          <div className="homeFinalCTAActions">
            <Link href="/assessment" className="primaryBtn">
              {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
            </Link>

            <Link href="/assistant" className="secondaryBtn">
              {isArabic ? "اسأل الذكاء الصحي" : "Ask AI Health Assistant"}
            </Link>
          </div>
        </div>
      </section>

      <section className="socialProofSection">
        <p className="sectionLabel">
          {isArabic ? "منصة الذكاء الصحي" : "HEALTH INTELLIGENCE PLATFORM"}
        </p>

        <h2>
          {isArabic
            ? "كل ما تحتاجه لفهم صحتك في مكان واحد"
            : "Everything you need to understand your health"}
        </h2>

        <div className="socialProofGrid">
          <Link href="/intelligence" className="socialProofCard">
            <h3>Health Profile</h3>
            <p>
              {isArabic
                ? "ملف صحي ذكي مبني على بياناتك"
                : "Personalized health profile built around your data"}
            </p>
          </Link>

          <Link href="/intelligence" className="socialProofCard">
            <h3>Risk Signals</h3>
            <p>
              {isArabic
                ? "اكتشاف أنماط المخاطر مبكراً"
                : "Detect health risk patterns early"}
            </p>
          </Link>

          <Link href="/history" className="socialProofCard">
            <h3>90-Day Forecast</h3>
            <p>
              {isArabic
                ? "توقع الاتجاه الصحي القادم"
                : "Forecast future health trends"}
            </p>
          </Link>

          <Link href="/doctor-portal" className="socialProofCard">
            <h3>Doctor Brief</h3>
            <p>
              {isArabic
                ? "ملخص جاهز للطبيب"
                : "Professional doctor-ready summary"}
            </p>
          </Link>
        </div>

        <p className="homeFooterDisclaimer">
          {isArabic
            ? "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل الطبيب أو التشخيص الطبي."
            : "OrganHeal provides educational health intelligence and does not replace medical diagnosis or licensed care."}
        </p>
      </section>
    </main>
  );
}