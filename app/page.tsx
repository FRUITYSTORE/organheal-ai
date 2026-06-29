"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [heroQuestion, setHeroQuestion] = useState("");
  const [heroAnswer, setHeroAnswer] = useState("");
  const [heroLoading, setHeroLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    checkUser();

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

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setIsLoggedIn(Boolean(data.user));
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
      const result = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: heroQuestion,
          language,
          healthContext: null,
        }),
      });

      const data = await result.json();

      setHeroAnswer(
        data.response ||
          text(
            "I could not generate an answer right now.",
            "لم أستطع إنشاء إجابة الآن."
          )
      );
    } catch {
      setHeroAnswer(
        text(
          "A temporary error occurred while connecting to the assistant.",
          "حدث خطأ مؤقت أثناء الاتصال بالمساعد."
        )
      );
    } finally {
      setHeroLoading(false);
    }
  }

  const trustCards = [
    {
      icon: "🧠",
      title: text("Educational Health Intelligence", "ذكاء صحي تعليمي"),
      description: text(
        "Designed to help you understand and prepare, not replace doctors.",
        "يساعدك على الفهم والتحضير، ولا يستبدل الطبيب."
      ),
    },
    {
      icon: "👤",
      title: text("Patient-Friendly Reports", "ملخصات مفهومة للمريض"),
      description: text(
        "Simple summaries that make health information easier to understand.",
        "ملخصات سهلة تساعدك على فهم معلوماتك الصحية."
      ),
    },
    {
      icon: "🩺",
      title: text("Doctor-Ready Briefs", "ملخصات جاهزة للطبيب"),
      description: text(
        "Structured briefs to support better conversations with clinicians.",
        "ملخصات منظمة تساعدك على مناقشة النتائج مع الطبيب."
      ),
    },
    {
      icon: "🔒",
      title: text("Private Health Data", "بيانات صحية خاصة"),
      description: text(
        "Your reports and results stay connected to your own account.",
        "تقاريرك ونتائجك تبقى مرتبطة بحسابك الصحي."
      ),
    },
  ];

  const steps = [
    {
      number: "01",
      icon: "🫀",
      title: text("Complete Assessment", "أكمل التقييم الصحي"),
      description: text(
        "Answer guided questions about organ health and lifestyle patterns.",
        "أجب عن أسئلة موجهة حول صحة الأعضاء ونمط الحياة."
      ),
      href: "/assessment",
    },
    {
      number: "02",
      icon: "📄",
      title: text("Upload Medical Reports", "ارفع التقارير الطبية"),
      description: text(
        "Upload lab results, radiology reports, or written medical documents.",
        "ارفع نتائج المختبر، تقارير الأشعة، أو المستندات الطبية المكتوبة."
      ),
      href: "/lab-upload",
    },
    {
      number: "03",
      icon: "🧠",
      title: text("Generate Intelligence", "ولّد الذكاء الصحي"),
      description: text(
        "Turn reports and assessments into summaries, risk signals, and next steps.",
        "حوّل التقارير والتقييمات إلى ملخصات وإشارات وخطوات تالية."
      ),
      href: "/intelligence",
    },
    {
      number: "04",
      icon: "🩺",
      title: text("Prepare Doctor Brief", "جهّز ملخص الطبيب"),
      description: text(
        "Use doctor-ready summaries to support clearer medical conversations.",
        "استخدم ملخصات جاهزة للطبيب لتحضير نقاش طبي أوضح."
      ),
      href: "/doctor-portal",
    },
  ];

  const reportFeatures = [
    {
      icon: "🧪",
      title: text("Laboratory Reports", "تقارير المختبر"),
      description: text(
        "CBC, liver, kidney, lipid, glucose, HbA1c, vitamins, and more.",
        "CBC، الكبد، الكلى، الدهون، السكر، HbA1c، الفيتامينات، وأكثر."
      ),
      href: "/lab-upload",
    },
    {
      icon: "🩻",
      title: text("Radiology Reports", "تقارير الأشعة"),
      description: text(
        "Explain written CT, MRI, X-ray, and ultrasound reports.",
        "شرح تقارير CT و MRI والأشعة والسونار المكتوبة."
      ),
      href: "/lab-upload",
    },
    {
      icon: "📋",
      title: text("Medical Documents", "المستندات الطبية"),
      description: text(
        "Discharge summaries, doctor notes, prescriptions, and follow-up plans.",
        "ملخصات الخروج، ملاحظات الطبيب، الوصفات، وخطط المتابعة."
      ),
      href: "/lab-upload",
    },
    {
      icon: "📈",
      title: text("Risk Signals & Opportunities", "إشارات وفرص صحية"),
      description: text(
        "Understand what may need attention and what can be improved.",
        "افهم ما قد يحتاج انتباهًا وما يمكن تحسينه."
      ),
      href: "/intelligence",
    },
  ];

  const intelligenceFeatures = [
    {
      icon: "🪪",
      title: text("Health Passport", "ملف صحي ذكي"),
      description: text(
        "A structured view of your health profile, priorities, and direction.",
        "صورة منظمة عن ملفك الصحي، أولوياتك، والاتجاه العام."
      ),
    },
    {
      icon: "📊",
      title: text("Trends & Patterns", "اتجاهات وأنماط"),
      description: text(
        "Connect assessments, reports, check-ins, and history over time.",
        "ربط التقييمات، التقارير، التحديثات، والتاريخ مع الوقت."
      ),
    },
    {
      icon: "🧾",
      title: text("Patient Summary", "ملخص للمريض"),
      description: text(
        "Clear explanations written in patient-friendly language.",
        "شرح واضح بلغة بسيطة تساعد المريض على الفهم."
      ),
    },
    {
      icon: "🩺",
      title: text("Doctor Brief", "ملخص الطبيب"),
      description: text(
        "A structured brief to discuss findings with a licensed clinician.",
        "ملخص منظم لمناقشة النتائج مع طبيب مختص."
      ),
    },
  ];

  const educationFeatures = [
    {
      icon: "📚",
      title: text("Simple Health Articles", "مقالات صحية مبسطة"),
      description: text(
        "Learn about organs, labs, lifestyle, and prevention in plain language.",
        "تعلم عن الأعضاء، الفحوصات، نمط الحياة، والوقاية بلغة بسيطة."
      ),
    },
    {
      icon: "🧪",
      title: text("Lab Marker Explanations", "شرح مؤشرات المختبر"),
      description: text(
        "Understand LDL, HDL, HbA1c, creatinine, liver enzymes, and vitamin D.",
        "افهم LDL، HDL، HbA1c، الكرياتينين، إنزيمات الكبد، وفيتامين D."
      ),
    },
    {
      icon: "❓",
      title: text("Doctor Visit Questions", "أسئلة لزيارة الطبيب"),
      description: text(
        "Prepare better questions before your appointment.",
        "حضّر أسئلة أفضل قبل موعد الطبيب."
      ),
    },
  ];

  const planComparison = [
    {
      name: "OrganHeal Free",
      badge: text("Start here", "ابدأ هنا"),
      description: text(
        "A safe entry point to understand your health with basic tools.",
        "بداية آمنة لفهم صحتك من خلال أدوات أساسية."
      ),
      features: [
        text("Basic health assessment", "تقييم صحي أساسي"),
        text("Limited health assistant", "مساعد صحي محدود"),
        text("Limited report uploads", "رفع محدود للتقارير"),
        text("Basic health education", "تثقيف صحي أساسي"),
      ],
      href: "/assessment",
      button: text("Start Free", "ابدأ مجانًا"),
      featured: false,
    },
    {
      name: "OrganHeal Plus",
      badge: text("Future subscription value", "قيمة الاشتراك القادمة"),
      description: text(
        "Designed for ongoing follow-up, saved intelligence, PDF summaries, and deeper insights.",
        "مصمم للمتابعة المستمرة، حفظ الذكاء، ملخصات PDF، وتحليلات أعمق."
      ),
      features: [
        text("Advanced health intelligence", "ذكاء صحي متقدم"),
        text("Patient-friendly summaries", "ملخصات مفهومة للمريض"),
        text("Doctor-ready briefs", "ملخصات جاهزة للطبيب"),
        text("Saved intelligence history", "حفظ نتائج الذكاء الصحي"),
        text("Trends and risk signals", "اتجاهات وإشارات مخاطر"),
        text("Monthly follow-up value", "قيمة متابعة شهرية"),
      ],
      href: "/pricing",
      button: text("View Plans", "عرض الخطط"),
      featured: true,
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Personal Health Intelligence System", "نظام ذكاء صحي شخصي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Understand your health clearly. Know your next step.",
                  "افهم صحتك بوضوح. واعرف خطوتك التالية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Turn health assessments, medical reports, and lab results into patient-friendly summaries, doctor-ready briefs, and clear health intelligence.",
                  "حوّل التقييمات الصحية، التقارير الطبية، ونتائج المختبر إلى ملخصات مفهومة للمريض، ملخصات جاهزة للطبيب، وذكاء صحي واضح."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Free Assessment", "ابدأ التقييم المجاني")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Medical Reports", "رفع التقارير الطبية")}
                </Link>

                <Link href="/pricing" className="secondaryBtn">
                  {text("View Plans", "عرض الخطط")}
                </Link>
              </div>

              <p className="ohMetricHint" style={{ marginTop: "18px", maxWidth: "760px" }}>
                {text(
                  "OrganHeal provides educational health intelligence and does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
                  "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
                )}
              </p>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Ask OrganHeal", "اسأل OrganHeal")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Quick health intelligence", "ذكاء صحي سريع")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Ask a general health question, then continue inside your full Intelligence Center when ready.",
                  "اسأل سؤالًا صحيًا عامًا، ثم تابع داخل مركز الذكاء الكامل عندما تكون جاهزًا."
                )}
              </p>

              <div className="ohStack" style={{ gap: "12px", marginTop: "16px" }}>
                <input
                  type="text"
                  value={heroQuestion}
                  onChange={(event) => setHeroQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") askHeroAI();
                  }}
                  placeholder={text(
                    "Ask about cholesterol, sleep, liver, heart health...",
                    "اسأل عن الكوليسترول، النوم، الكبد، القلب..."
                  )}
                />

                <button
                  type="button"
                  className="primaryBtn"
                  onClick={askHeroAI}
                  disabled={heroLoading}
                >
                  {heroLoading
                    ? text("Thinking...", "جاري التفكير...")
                    : text("Ask Health Intelligence", "اسأل الذكاء الصحي")}
                </button>
              </div>

              {heroAnswer && (
                <div className="ohTrustNotice" style={{ marginTop: "16px" }}>
                  <span aria-hidden="true">💡</span>
                  <div>
                    <strong>
                      {text("Quick AI Insight", "رؤية سريعة من الذكاء الصحي")}
                    </strong>
                    <br />
                    {heroAnswer}
                  </div>
                </div>
              )}

              <div className="ohDivider" />

              <div className="ohButtonRow">
                <Link href="/intelligence" className="primaryBtn">
                  {text("Open Intelligence Center", "فتح مركز الذكاء")}
                </Link>

                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard" className="secondaryBtn">
                      {text("Dashboard", "لوحة التحكم")}
                    </Link>

                    <button type="button" className="secondaryBtn" onClick={signOut}>
                      {text("Sign Out", "تسجيل الخروج")}
                    </button>
                  </>
                ) : (
                  <Link href="/signup" className="secondaryBtn">
                    {text("Create Free Account", "إنشاء حساب مجاني")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          {trustCards.map((card) => (
            <article className="ohMetricCard" key={card.title}>
              <span style={{ fontSize: "1.6rem" }}>{card.icon}</span>
              <span className="ohMetricLabel" style={{ marginTop: "10px" }}>
                {card.title}
              </span>
              <span className="ohMetricHint">{card.description}</span>
            </article>
          ))}
        </section>

        {!isLoggedIn && (
          <section className="ohActionPanel">
            <div className="ohCardHeader" style={{ marginBottom: 0 }}>
              <div>
                <p className="ohMetricLabel">
                  {text("Build your complete health profile", "ابنِ ملفك الصحي الكامل")}
                </p>

                <h2 className="ohCardTitle" style={{ fontSize: "1.6rem" }}>
                  {text(
                    "Create a free account to save reports, assessments, and intelligence results.",
                    "أنشئ حسابًا مجانيًا لحفظ التقارير، التقييمات، ونتائج الذكاء الصحي."
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Start free, then unlock deeper follow-up value as OrganHeal grows.",
                    "ابدأ مجانًا، ثم انتقل لاحقًا إلى قيمة متابعة صحية أعمق."
                  )}
                </p>
              </div>

              <div className="ohButtonRow">
                <Link href="/signup" className="primaryBtn">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </Link>

                <Link href="/login" className="secondaryBtn">
                  {text("Sign In", "تسجيل الدخول")}
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("How OrganHeal Works", "كيف يعمل OrganHeal؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Four steps to clearer health intelligence",
                  "أربع خطوات لفهم صحتك بوضوح"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Start with an assessment, upload your medical reports, generate intelligence, then prepare a doctor-ready brief.",
                  "ابدأ بتقييم صحي، ارفع تقاريرك الطبية، ولّد الذكاء الصحي، ثم جهّز ملخصًا جاهزًا للطبيب."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {steps.map((step) => (
              <Link href={step.href} className="ohCard" key={step.number}>
                <p className="ohMetricLabel">{step.number}</p>
                <div style={{ fontSize: "2rem", margin: "10px 0" }}>{step.icon}</div>
                <h3 className="ohCardTitle" style={{ fontSize: "1.1rem" }}>
                  {step.title}
                </h3>
                <p className="ohCardText">{step.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Medical Report Intelligence", "ذكاء التقارير الطبية")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "From medical reports to clear health understanding",
                  "من التقارير الطبية إلى فهم صحي واضح"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal helps organize and explain written reports without replacing doctors or providing medical diagnosis.",
                  "يساعد OrganHeal على تنظيم وشرح التقارير المكتوبة دون استبدال الطبيب أو تقديم تشخيص طبي."
                )}
              </p>
            </div>

            <Link href="/lab-upload" className="primaryBtn">
              {text("Upload Report", "رفع تقرير")}
            </Link>
          </div>

          <div className="ohGrid cols4">
            {reportFeatures.map((feature) => (
              <Link href={feature.href} className="ohMetricCard" key={feature.title}>
                <span style={{ fontSize: "1.8rem" }}>{feature.icon}</span>
                <span className="ohMetricLabel" style={{ marginTop: "10px" }}>
                  {feature.title}
                </span>
                <span className="ohMetricHint">{feature.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Why OrganHeal AI?", "لماذا OrganHeal AI؟")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Not just a medical report reader",
                "ليس مجرد قارئ تقارير طبية"
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal connects assessments, reports, check-ins, patient summaries, doctor briefs, and follow-up plans into one health intelligence journey.",
                "يربط OrganHeal التقييمات، التقارير، Check-Ins، ملخصات المريض، ملخصات الطبيب، وخطط المتابعة داخل رحلة صحية واحدة."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {intelligenceFeatures.map((feature) => (
                <div className="ohTimelineItem" key={feature.title}>
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {feature.icon} {feature.title}
                    </p>
                    <p className="ohTimelineMeta">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="ohButtonRow" style={{ marginTop: "20px" }}>
              <Link href="/intelligence" className="primaryBtn">
                {text("Explore Intelligence", "استكشف مركز الذكاء")}
              </Link>

              <Link href="/reports" className="secondaryBtn">
                {text("Reports Library", "مكتبة التقارير")}
              </Link>
            </div>
          </article>

          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Education Hub Preview", "مركز التثقيف الصحي")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Learn about your health in simple language",
                "تعلّم عن صحتك بلغة بسيطة"
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal can help explain medical terms, lab markers, and the right questions to discuss with your doctor.",
                "يساعد OrganHeal على شرح المصطلحات الطبية، مؤشرات المختبر، والأسئلة المهمة لمناقشتها مع الطبيب."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {educationFeatures.map((feature) => (
                <div className="ohTimelineItem" key={feature.title}>
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {feature.icon} {feature.title}
                    </p>
                    <p className="ohTimelineMeta">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="ohButtonRow" style={{ marginTop: "20px" }}>
              <Link href="/library" className="primaryBtn">
                {text("Explore Health Education", "استكشف التثقيف الصحي")}
              </Link>

              <Link href="/blog" className="secondaryBtn">
                {text("Read Blog", "قراءة المقالات")}
              </Link>
            </div>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Follow-Up & Subscription Value", "المتابعة وقيمة الاشتراك")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Start free, then unlock deeper health intelligence",
                  "ابدأ مجانًا، ثم انتقل إلى ذكاء صحي أعمق"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal Free helps users start. OrganHeal Plus is designed for ongoing follow-up, saved results, PDF summaries, and deeper health intelligence.",
                  "OrganHeal Free يساعد المستخدم على البداية. OrganHeal Plus مصمم للمتابعة المستمرة، حفظ النتائج، ملخصات PDF، وذكاء صحي أعمق."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols2">
            {planComparison.map((plan) => (
              <article
                className="ohCard"
                key={plan.name}
                style={{
                  borderColor: plan.featured
                    ? "rgba(20, 184, 166, 0.42)"
                    : undefined,
                }}
              >
                <div className="ohCardHeader">
                  <div>
                    <span className={`ohStatusBadge ${plan.featured ? "good" : "neutral"}`}>
                      {plan.badge}
                    </span>

                    <h3 className="ohCardTitle" style={{ marginTop: "12px" }}>
                      {plan.name}
                    </h3>
                  </div>
                </div>

                <p className="ohCardText">{plan.description}</p>

                <div className="ohTimeline" style={{ marginTop: "18px" }}>
                  {plan.features.map((feature) => (
                    <div className="ohTimelineItem" key={feature}>
                      <span className="ohTimelineDot" />
                      <p className="ohTimelineTitle">{feature}</p>
                    </div>
                  ))}
                </div>

                <div className="ohDivider" />

                <Link href={plan.href} className={plan.featured ? "primaryBtn" : "secondaryBtn"}>
                  {plan.button}
                </Link>
              </article>
            ))}
          </div>

          <p className="ohMetricHint" style={{ marginTop: "18px", textAlign: "center" }}>
            {text(
              "Payments and real feature gating will be added later after the plans page is approved.",
              "الدفع والقفل الفعلي للميزات سيتم بناؤه لاحقًا بعد اعتماد صفحة الخطط."
            )}
          </p>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start Your Health Intelligence Journey", "ابدأ رحلتك الصحية الذكية")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Turn your reports and health data into clear understanding today.",
                  "حوّل تقاريرك وبياناتك الصحية إلى فهم واضح اليوم."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Start with an assessment, upload your medical reports, then open your Health Intelligence Center.",
                  "ابدأ بتقييم صحي، ارفع تقاريرك الطبية، ثم افتح مركز الذكاء الصحي."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/assessment" className="primaryBtn">
                {text("Start Free Assessment", "ابدأ التقييم المجاني")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Medical Reports", "رفع التقارير الطبية")}
              </Link>
            </div>
          </div>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>{text("Medical safety reminder", "تذكير السلامة الطبية")}</strong>
            <br />
            {text(
              "OrganHeal explains medical information for education and preparation only. It does not diagnose, treat, or provide emergency medical advice.",
              "OrganHeal يشرح المعلومات الطبية للتثقيف والتحضير فقط. لا يشخص ولا يعالج ولا يقدم نصائح طبية طارئة."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
