"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

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

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>("en");
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

  const modules = [
    text("Heart Intelligence", "ذكاء القلب"),
    text("Lung Intelligence", "ذكاء الرئة"),
    text("Kidney Intelligence", "ذكاء الكلى"),
    text("Liver Intelligence", "ذكاء الكبد"),
    text("Brain Intelligence", "ذكاء الدماغ"),
    text("Metabolic Intelligence", "الذكاء الأيضي"),
    text("Lab & Report Intelligence", "ذكاء المختبر والتقارير"),
    text("Health Plan & Follow-Up", "الخطة الصحية والمتابعة"),
  ];

  const whatItDoes = [
    {
      icon: "🫀",
      title: text("Health Assessments", "تقييمات صحية"),
      description: text(
        "Structured assessments for organ systems such as heart, lung, kidney, liver, brain, and metabolic health.",
        "تقييمات منظمة لصحة الأعضاء مثل القلب، الرئة، الكلى، الكبد، الدماغ، والصحة الأيضية."
      ),
    },
    {
      icon: "📄",
      title: text("Report Intelligence", "ذكاء التقارير"),
      description: text(
        "Organizes and explains written medical reports and lab results in a patient-friendly way.",
        "ينظم ويشرح التقارير الطبية المكتوبة ونتائج المختبر بطريقة مفهومة للمريض."
      ),
    },
    {
      icon: "📊",
      title: text("Follow-Up Planning", "خطة متابعة"),
      description: text(
        "Connects assessments, reports, check-ins, and history into a practical follow-up direction.",
        "يربط التقييمات، التقارير، التحديثات الصحية، والتاريخ الصحي داخل اتجاه متابعة عملي."
      ),
    },
    {
      icon: "🩺",
      title: text("Doctor-Ready Brief", "ملخص جاهز للطبيب"),
      description: text(
        "Prepares structured summaries that can support clearer conversations with clinicians.",
        "يجهز ملخصات منظمة تساعد على نقاش أوضح مع الطبيب أو مقدم الرعاية."
      ),
    },
  ];

  const safetyItems = [
    {
      title: text("Educational Guidance", "معلومات تعليمية"),
      description: text(
        "OrganHeal supports understanding and preparation. It is not a tool for independent treatment decisions.",
        "OrganHeal يساعد على الفهم والتحضير، وليس أداة لاتخاذ قرارات علاجية مستقلة."
      ),
      tone: "good",
    },
    {
      title: text("No Diagnosis or Treatment", "لا يشخص ولا يعالج"),
      description: text(
        "It does not provide diagnosis, treatment, prescriptions, or emergency medical advice.",
        "لا يقدم تشخيصًا طبيًا، علاجًا، وصفات دوائية، أو نصيحة طبية طارئة."
      ),
      tone: "risk",
    },
    {
      title: text("Clinician Review Matters", "مراجعة الطبيب مهمة"),
      description: text(
        "Abnormal results, symptoms, and medical decisions should be reviewed with licensed professionals.",
        "النتائج غير الطبيعية، الأعراض، والقرارات الطبية يجب مراجعتها مع مختص مرخص."
      ),
      tone: "moderate",
    },
    {
      title: text("Emergency Symptoms", "الأعراض الطارئة"),
      description: text(
        "For severe chest pain, severe shortness of breath, fainting, confusion, severe bleeding, or urgent symptoms, seek medical care immediately.",
        "في حال ألم صدر شديد، ضيق نفس شديد، إغماء، تشوش، نزيف شديد، أو أعراض طارئة، اطلب الرعاية الطبية فورًا."
      ),
      tone: "risk",
    },
  ];

  const workflow = [
    {
      step: "01",
      title: text("Start with assessment", "ابدأ بالتقييم"),
      description: text(
        "Build an initial view of organ health and priority areas.",
        "ابنِ صورة أولية عن صحة الأعضاء ومناطق الأولوية."
      ),
      href: "/assessment",
    },
    {
      step: "02",
      title: text("Upload reports", "ارفع التقارير"),
      description: text(
        "Add lab reports, radiology reports, discharge summaries, or medical documents.",
        "أضف تقارير المختبر، الأشعة، ملخصات الخروج، أو المستندات الطبية."
      ),
      href: "/lab-upload",
    },
    {
      step: "03",
      title: text("Generate intelligence", "ولّد الذكاء الصحي"),
      description: text(
        "Turn health data into summaries, signals, opportunities, and next steps.",
        "حوّل البيانات الصحية إلى ملخصات، إشارات، فرص، وخطوات تالية."
      ),
      href: "/intelligence",
    },
    {
      step: "04",
      title: text("Prepare follow-up", "جهّز المتابعة"),
      description: text(
        "Use the Health Plan and Doctor Portal to prepare for a clearer clinical discussion.",
        "استخدم الخطة الصحية وبوابة الطبيب للتحضير لنقاش طبي أوضح."
      ),
      href: "/health-plan",
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("About OrganHeal AI", "عن OrganHeal AI")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Personal Health Intelligence for clearer understanding.",
                  "ذكاء صحي شخصي يساعدك على فهم صحتك بوضوح."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal AI is an educational and organizational health intelligence platform that helps users understand health assessments, medical reports, lab results, and follow-up patterns in a clear and structured way.",
                  "OrganHeal AI منصة صحية تعليمية وتنظيمية تساعد المستخدمين على فهم التقييمات الصحية، التقارير الطبية، نتائج المختبر، وأنماط المتابعة بطريقة واضحة ومنظمة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Assessment", "ابدأ التقييم الصحي")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>

                <Link href="/medical-disclaimer" className="secondaryBtn">
                  {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Core Mission", "المهمة الأساسية")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Turn health data into practical understanding.",
                      "تحويل البيانات الصحية إلى فهم عملي."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "The goal is to help users organize health information, understand important signals, prepare better questions for doctors, and track changes over time without providing diagnosis or treatment.",
                  "الهدف هو مساعدة المستخدم على تنظيم معلوماته الصحية، فهم المؤشرات المهمة، تجهيز أسئلة أفضل للطبيب، ومتابعة التغيرات الصحية مع الوقت دون تقديم تشخيص أو علاج."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("What OrganHeal Provides", "ماذا يقدم OrganHeal؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "One system for assessments, reports, intelligence, and follow-up.",
                  "نظام واحد للتقييمات، التقارير، الذكاء، والمتابعة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal is designed to connect the main pieces of a personal health journey into a structured experience.",
                  "صُمم OrganHeal لربط أهم أجزاء الرحلة الصحية الشخصية داخل تجربة منظمة."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {whatItDoes.map((item) => (
              <article className="ohMetricCard" key={item.title}>
                <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
                <span className="ohMetricLabel" style={{ marginTop: "10px" }}>
                  {item.title}
                </span>
                <span className="ohMetricHint">{item.description}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Personal Health Intelligence Vision", "رؤية الذكاء الصحي الشخصي")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Beyond a single report reader.",
                "أكثر من مجرد قارئ تقرير واحد."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal is being built as a Personal Health Intelligence Operating System: a place where assessments, reports, check-ins, history, doctor briefs, and follow-up plans work together.",
                "يتم بناء OrganHeal كنظام تشغيل للذكاء الصحي الشخصي: مكان تعمل فيه التقييمات، التقارير، التحديثات الصحية، التاريخ، ملخصات الطبيب، وخطط المتابعة معًا."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {workflow.map((item) => (
                <Link href={item.href} className="ohTimelineItem" key={item.step}>
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {item.step}. {item.title}
                    </p>
                    <p className="ohTimelineMeta">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Core Modules", "الوحدات الأساسية")}
            </p>

            <h2 className="ohCardTitle">
              {text("What OrganHeal AI includes", "ماذا يتضمن OrganHeal AI؟")}
            </h2>

            <p className="ohCardText">
              {text(
                "The platform is organized around organ health, reports, intelligence, and follow-up.",
                "المنصة منظمة حول صحة الأعضاء، التقارير، الذكاء الصحي، والمتابعة."
              )}
            </p>

            <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
              {modules.map((module) => (
                <article className="ohMetricCard" key={module}>
                  <span className="ohStatusBadge neutral">{module}</span>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Trust & Medical Safety", "الثقة والسلامة الطبية")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "What OrganHeal does and does not do.",
                  "ما الذي يفعله OrganHeal وما الذي لا يفعله؟"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Safety is part of the product. OrganHeal is designed for education, organization, and preparation, not diagnosis or emergency care.",
                  "السلامة جزء من المنتج. OrganHeal مصمم للتثقيف، التنظيم، والتحضير، وليس للتشخيص أو الرعاية الطارئة."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {safetyItems.map((item) => (
              <article className="ohMetricCard" key={item.title}>
                <span className={`ohStatusBadge ${item.tone}`}>
                  {item.title}
                </span>
                <span className="ohMetricHint" style={{ marginTop: "12px" }}>
                  {item.description}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Patient-Friendly", "مفهوم للمريض")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Clear summaries without overwhelming medical language.",
                "ملخصات واضحة دون تعقيد طبي زائد."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal helps translate health information into simpler explanations so users can understand what they are reading and what to ask next.",
                "يساعد OrganHeal على تحويل المعلومات الصحية إلى شرح أبسط حتى يفهم المستخدم ما يقرأه وما الأسئلة التالية."
              )}
            </p>

            <Link href="/reports" className="secondaryBtn">
              {text("Open Reports Library", "فتح مكتبة التقارير")}
            </Link>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Doctor-Ready", "جاهز للطبيب")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Structured briefs for better clinical conversations.",
                "ملخصات منظمة لنقاش طبي أفضل."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The Doctor Portal organizes assessment data, report intelligence, check-ins, and history into a concise pre-visit summary.",
                "تنظم بوابة الطبيب بيانات التقييم، ذكاء التقارير، التحديثات الصحية، والتاريخ داخل ملخص مختصر قبل الزيارة."
              )}
            </p>

            <Link href="/doctor-portal" className="primaryBtn">
              {text("Open Doctor Portal", "فتح بوابة الطبيب")}
            </Link>
          </article>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Medical safety reminder", "تذكير السلامة الطبية")}
            </strong>
            <br />
            {text(
              "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care.",
              "OrganHeal AI يقدم ذكاء صحي تعليمي وتنظيمي فقط. لا يشخص ولا يعالج ولا يصف علاجًا ولا يقدم نصائح طارئة ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Get Started", "ابدأ الآن")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Start with an assessment or upload a medical report.",
                  "ابدأ بتقييم صحي أو ارفع تقريرًا طبيًا."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The best way to use OrganHeal is to begin with a health assessment, upload medical reports or lab results, then open the Health Intelligence Center for a structured summary.",
                  "أفضل طريقة لاستخدام OrganHeal هي البدء بتقييم صحي، ثم رفع التقارير الطبية أو نتائج المختبر، وبعدها فتح مركز الذكاء الصحي للحصول على ملخص منظم."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/assessment" className="primaryBtn">
                {text("Start Assessment", "ابدأ التقييم")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Medical Report", "ارفع تقريرًا طبيًا")}
              </Link>

              <Link href="/contact" className="secondaryBtn">
                {text("Contact", "تواصل معنا")}
              </Link>

              <Link href="/privacy" className="secondaryBtn">
                {text("Privacy Policy", "سياسة الخصوصية")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
