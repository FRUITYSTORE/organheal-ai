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
  const [selectedLabPreview, setSelectedLabPreview] = useState("");

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
      "AI-powered personal health intelligence platform for assessments, medical report intelligence, health insights, and doctor-ready summaries.",
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

    if (file.type.startsWith("image/")) {
      setSelectedLabPreview(URL.createObjectURL(file));
    } else {
      setSelectedLabPreview("");
    }
  }

  function handleHeroDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleHeroFile(file);
    } else {
      setHeroAnswer(
        isArabic
          ? "لم يتم اكتشاف ملف. اسحب الملف من مجلد التحميلات وليس من شريط تحميل المتصفح."
          : "No file detected. Please drag the file from your Downloads folder, not from the browser download bar."
      );
    }
  }

  function handleHeroDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function removeHeroLabFile() {
    setSelectedLabFile(null);
    setSelectedLabPreview("");
  }

  async function analyzeHeroLabFile() {
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
        file_url: signedUrlData?.signedUrl || null,
        analysis_status: "analyzed",
        ai_summary:
          "Medical report uploaded successfully. AI extraction will process this report and generate health intelligence in the next phase.",
      });

    if (databaseError) {
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
                ? "حوّل التقييمات الصحية والتقارير الطبية ونتائج المختبر إلى ذكاء صحي واضح يساعدك على فهم المخاطر والفرص والخطوة التالية."
                : "Turn health assessments, medical reports, and lab results into clear intelligence about risks, opportunities, and your next best action."}
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
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleHeroFile(file);
                  }}
                />

                {selectedLabFile ? (
                  <>
                    <button
                      type="button"
                      className="heroFileRemoveBtn"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeHeroLabFile();
                      }}
                    >
                      ×
                    </button>

                    {selectedLabPreview && (
                      <img
                        src={selectedLabPreview}
                        alt="Selected medical report preview"
                        className="heroLabPreviewImage"
                      />
                    )}

                    <span>{selectedLabFile.name}</span>
                    <small>{isArabic ? "جاهز للتحليل" : "Ready for analysis"}</small>
                  </>
                ) : (
                  <>
                    <span>
                      {isArabic
                        ? "اسحب تقريرًا طبيًا أو اضغط للرفع"
                        : "Drop a medical report or click to upload"}
                    </span>

                    <small>
                      {isArabic
                        ? "ملف سريع هنا، أو حتى 10 ملفات في صفحة التحليل"
                        : "Quick file here, or up to 10 files in Medical Report Upload"}
                    </small>
                  </>
                )}
              </label>

              {selectedLabFile && (
                <button
                  type="button"
                  className="primaryBtn"
                  onClick={analyzeHeroLabFile}
                >
                  {isArabic ? "تحليل سريع" : "Quick Analyze"}
                </button>
              )}
            </div>

            <Link href="/lab-upload" className="homeLabBatchLink">
              {isArabic
                ? "لديك عدة ملفات؟ ارفع حتى 10 ملفات من صفحة التقارير الطبية"
                : "Have multiple reports? Upload up to 10 files in Medical Report Upload"}
            </Link>

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

      <section className="homeOutcomes">
        <div className="homeSectionHeader">
          <p className="sectionLabel">
            {isArabic ? "المخرجات الصحية" : "Health Outcomes"}
          </p>

          <h2>
            {isArabic
              ? "ليس مجرد ملفات. بل فهم صحي قابل للاستخدام."
              : "Not just files. Usable health intelligence."}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal يحول التقييمات والتقارير الطبية إلى مخرجات صحية مفهومة وقابلة للمشاركة."
              : "OrganHeal transforms assessments and medical reports into understandable, shareable health outputs."}
          </p>
        </div>

        <div className="outcomesGrid">
          <Link href="/intelligence" className="outcomeCard">
            <div className="outcomeIcon">🧬</div>
            <h3>{isArabic ? "الملف الصحي الذكي" : "Health Profile"}</h3>
            <p>
              {isArabic
                ? "صورة منظمة عن حالتك الصحية بناءً على بياناتك."
                : "An organized view of your health based on your data."}
            </p>
          </Link>

          <Link href="/intelligence" className="outcomeCard">
            <div className="outcomeIcon">⚠️</div>
            <h3>{isArabic ? "إشارات المخاطر" : "Risk Signals"}</h3>
            <p>
              {isArabic
                ? "اكتشاف الأنماط الصحية التي تستحق المتابعة."
                : "Detect health patterns that may need follow-up."}
            </p>
          </Link>

          <Link href="/history" className="outcomeCard">
            <div className="outcomeIcon">📈</div>
            <h3>{isArabic ? "توقع 90 يوم" : "90-Day Forecast"}</h3>
            <p>
              {isArabic
                ? "فهم الاتجاه الصحي المحتمل خلال الفترة القادمة."
                : "Understand where your health trend may be heading."}
            </p>
          </Link>

          <Link href="/doctor-portal" className="outcomeCard">
            <div className="outcomeIcon">🩺</div>
            <h3>{isArabic ? "ملخص للطبيب" : "Doctor-Ready Summary"}</h3>
            <p>
              {isArabic
                ? "ملخص واضح يساعدك على التحضير للزيارة الطبية."
                : "A clear summary to help you prepare for healthcare visits."}
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