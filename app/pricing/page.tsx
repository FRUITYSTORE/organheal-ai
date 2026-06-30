"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function PricingPage() {
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

  const freeFeatures = [
    text("Basic organ health assessments", "تقييمات صحية أساسية للأعضاء"),
    text("Simple dashboard to start the journey", "لوحة تحكم بسيطة لبدء الرحلة"),
    text("Limited medical report uploads", "رفع محدود للتقارير الطبية"),
    text("Basic wellness check-ins", "تحديثات صحية أساسية"),
    text("Simple educational health explanations", "شرح صحي تعليمي مبسط"),
  ];

  const plusFeatures = [
    text("Advanced medical report intelligence", "ذكاء صحي متقدم للتقارير الطبية"),
    text("Patient-friendly summaries", "ملخصات مفهومة للمريض"),
    text("Doctor-ready brief for visit preparation", "ملخص جاهز للطبيب للتحضير للزيارة"),
    text("Saved intelligence results inside the account", "حفظ نتائج الذكاء الصحي داخل الحساب"),
    text("Personal health plan based on connected data", "خطة صحية شخصية مبنية على البيانات"),
    text("Follow-up intelligence with a clear next best action", "ذكاء متابعة مع خطوة تالية واضحة"),
    text("Health History to track changes over time", "تاريخ صحي لمتابعة التغيرات مع الوقت"),
    text("Higher value for users who follow their health monthly", "قيمة أعلى لمن يتابع صحته شهريًا"),
  ];

  const futureFeatures = [
    text("Smart email or WhatsApp-style reminders", "تذكيرات ذكية عبر البريد أو بأسلوب WhatsApp"),
    text("Family profiles", "ملفات صحية عائلية"),
    text("Deeper doctor collaboration", "تعاون أعمق مع الطبيب"),
    text("Alerts when health patterns change", "تنبيهات عند تغير الأنماط الصحية"),
  ];

  const comparisonRows = [
    {
      feature: text("Health assessments", "التقييمات الصحية"),
      free: text("Basic", "أساسية"),
      plus: text("Advanced and connected to the plan", "متقدمة ومرتبطة بالخطة"),
    },
    {
      feature: text("Report uploads", "رفع التقارير"),
      free: text("Limited", "محدود"),
      plus: text("Expanded and organized in Reports Library", "أوسع ومنظم داخل مكتبة التقارير"),
    },
    {
      feature: text("Generated intelligence", "الذكاء المولد"),
      free: text("Limited", "محدود"),
      plus: text("Core Plus value", "قيمة أساسية في Plus"),
    },
    {
      feature: text("Patient summary", "ملخص المريض"),
      free: text("Unavailable or limited", "غير متاح أو محدود"),
      plus: text("Available", "متاح"),
    },
    {
      feature: text("Doctor brief", "ملخص الطبيب"),
      free: text("Unavailable or limited", "غير متاح أو محدود"),
      plus: text("Available", "متاح"),
    },
    {
      feature: text("Health plan", "الخطة الصحية"),
      free: text("General", "عامة"),
      plus: text("Personalized from connected data", "شخصية ومبنية على البيانات"),
    },
    {
      feature: text("Health history", "التاريخ الصحي"),
      free: text("Basic", "أساسي"),
      plus: text("Clearer trend tracking", "متابعة أوضح للتغيرات"),
    },
  ];

  const valueCards = [
    {
      number: "01",
      title: text("Report organization", "تنظيم التقارير"),
      description: text(
        "Every report is saved and connected to a clear path inside Reports Library and Intelligence Center.",
        "كل تقرير محفوظ ومرتبط بمسار واضح داخل مكتبة التقارير ومركز الذكاء."
      ),
    },
    {
      number: "02",
      title: text("Understandable intelligence", "ذكاء قابل للفهم"),
      description: text(
        "Turning reports into patient-friendly summaries and doctor-ready briefs.",
        "تحويل التقارير إلى ملخصات مفهومة للمريض وملخصات جاهزة للطبيب."
      ),
    },
    {
      number: "03",
      title: text("Follow-up plan", "خطة متابعة"),
      description: text(
        "Health Plan connects assessments, reports, generated intelligence, check-ins, and health history.",
        "الخطة الصحية تربط التقييمات، التقارير، الذكاء الصحي، التحديثات، والتاريخ الصحي."
      ),
    },
    {
      number: "04",
      title: text("Continuity", "الاستمرارية"),
      description: text(
        "Value increases as the user returns with check-ins, new reports, or follow-up results.",
        "القيمة تزيد كلما عاد المستخدم وأضاف تحديثًا صحيًا أو تقريرًا جديدًا أو نتيجة متابعة."
      ),
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Plans", "خطط OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Start free, then move into deeper health follow-up.",
                  "ابدأ مجانًا، ثم انتقل إلى متابعة صحية أعمق."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal Free helps users try the basics. OrganHeal Plus is designed for people who want saved reports, generated health intelligence, doctor-ready briefs, and a personalized follow-up plan over time.",
                  "OrganHeal Free يساعد المستخدم على تجربة الأساسيات. OrganHeal Plus مصمم لمن يريد حفظ التقارير، توليد ذكاء صحي، تحضير ملخص للطبيب، ومتابعة خطة صحية شخصية مع الوقت."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/signup" className="primaryBtn">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </Link>

                <Link href="/assessment" className="secondaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Current Status", "الحالة الحالية")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Payments are not enabled yet", "الدفع غير مفعّل بعد")}
                  </h2>
                </div>

                <span className="ohStatusBadge moderate">
                  {text("Preview", "عرض مبدئي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "This page explains the intended value structure before activating real subscriptions, payments, or feature gating.",
                  "هذه الصفحة توضّح هيكل القيمة المتوقع قبل تفعيل الاشتراكات، الدفع، أو قفل الميزات فعليًا."
                )}
              </p>

              <div className="ohDivider" />

              <p className="ohMetricLabel">
                {text("Build order", "ترتيب البناء")}
              </p>

              <p className="ohCardText">
                {text(
                  "First approve the plan value. Then build payment, limits, and subscription controls later.",
                  "أولًا نعتمد قيمة الخطط. بعدها نبني الدفع، الحدود، والتحكم بالاشتراكات لاحقًا."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <span className="ohStatusBadge neutral">
                  {text("Starter", "للبداية")}
                </span>

                <h2 className="ohCardTitle" style={{ marginTop: "12px" }}>
                  OrganHeal Free
                </h2>
              </div>
            </div>

            <p className="ohCardText">
              {text(
                "Best for trying OrganHeal and understanding the core experience.",
                "مناسب لتجربة OrganHeal وفهم الفكرة الأساسية."
              )}
            </p>

            <p className="ohMetricValue" style={{ marginTop: "18px" }}>
              {text("Free", "مجاني")}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {freeFeatures.map((feature) => (
                <div className="ohTimelineItem" key={feature}>
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">{feature}</p>
                </div>
              ))}
            </div>

            <div className="ohDivider" />

            <Link href="/signup" className="secondaryBtn">
              {text("Start Free", "ابدأ مجانًا")}
            </Link>
          </article>

          <article
            className="ohCard"
            style={{
              borderColor: "rgba(20, 184, 166, 0.42)",
              boxShadow: "0 24px 70px rgba(20, 184, 166, 0.12)",
            }}
          >
            <div className="ohCardHeader">
              <div>
                <span className="ohStatusBadge good">
                  {text("Subscription Value", "قيمة الاشتراك")}
                </span>

                <h2 className="ohCardTitle" style={{ marginTop: "12px" }}>
                  OrganHeal Plus
                </h2>
              </div>
            </div>

            <p className="ohCardText">
              {text(
                "The plan that creates monthly value: saved reports, health intelligence, patient summaries, doctor briefs, and personalized follow-up.",
                "الخطة التي تعطي قيمة شهرية: تقارير محفوظة، ذكاء صحي، ملخصات للمريض، ملخصات للطبيب، ومتابعة شخصية."
              )}
            </p>

            <p className="ohMetricValue" style={{ marginTop: "18px" }}>
              {text("Price to be announced", "السعر لاحقًا")}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {plusFeatures.map((feature) => (
                <div className="ohTimelineItem" key={feature}>
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">{feature}</p>
                </div>
              ))}
            </div>

            <div className="ohDivider" />

            <Link href="/intelligence" className="primaryBtn">
              {text("Explore Plus Value", "استكشف قيمة Plus")}
            </Link>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Comparison", "المقارنة")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "The real difference is continuous follow-up.",
                  "الفرق الحقيقي هو المتابعة المستمرة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Free explains the starting point. Plus connects reports, intelligence, health plan, and history into one follow-up experience.",
                  "Free يشرح نقطة البداية. Plus يربط التقارير، الذكاء الصحي، الخطة، والتاريخ الصحي داخل تجربة متابعة واحدة."
                )}
              </p>
            </div>
          </div>

          <div className="ohStack" style={{ gap: "10px" }}>
            <div
              className="ohMetricCard"
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr 1fr",
                gap: "12px",
                fontWeight: 900,
              }}
            >
              <span>{text("Feature", "الميزة")}</span>
              <span>Free</span>
              <span>Plus</span>
            </div>

            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="ohMetricCard"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1fr 1fr",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span className="ohMetricLabel">{row.feature}</span>
                <span className="ohMetricHint">{row.free}</span>
                <strong>{row.plus}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Why would users subscribe?", "لماذا قد يشترك المستخدم؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Monthly value comes from follow-up, not one report.",
                  "القيمة الشهرية تأتي من المتابعة، وليس من تقرير واحد."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Users do not pay only to read a report. They pay to know what to do after the report, how to follow up, and what changed over time.",
                  "المستخدم لا يدفع فقط مقابل قراءة تقرير. يدفع لأنه يريد معرفة ماذا يفعل بعد التقرير، كيف يتابع، وما الذي تغير مع الوقت."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {valueCards.map((card) => (
              <article className="ohMetricCard" key={card.number}>
                <span className="ohMetricLabel">{card.number}</span>
                <span className="ohMetricValue" style={{ fontSize: "1.2rem" }}>
                  {card.title}
                </span>
                <span className="ohMetricHint">{card.description}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Future Premium Layer", "طبقة Premium مستقبلية")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.6rem" }}>
                {text("Premium later, not now", "Premium لاحقًا، وليس الآن")}
              </h2>

              <p className="ohCardText">
                {text(
                  "These features do not need to be built before Free and Plus are stable. They are positioned as a future direction without promising immediate activation.",
                  "هذه الميزات لا نحتاج بناءها قبل تثبيت Free و Plus. نذكرها كاتجاه مستقبلي دون وعد بتفعيل فوري."
                )}
              </p>
            </div>
          </div>

          <div className="ohMetricGrid">
            {futureFeatures.map((feature) => (
              <article className="ohMetricCard" key={feature}>
                <span className="ohStatusBadge neutral">
                  {text("Future", "مستقبلي")}
                </span>
                <span className="ohMetricHint" style={{ marginTop: "10px" }}>
                  {feature}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">💳</span>
          <div>
            <strong>
              {text("No payment is active yet", "لا يوجد دفع مفعّل حاليًا")}
            </strong>
            <br />
            {text(
              "This page is for validating pricing value and user expectations. Real checkout, subscription limits, billing logic, and feature gating will be added later.",
              "هذه الصفحة لاعتماد قيمة التسعير وتوقعات المستخدم. الدفع الحقيقي، حدود الاشتراك، منطق الفوترة، وقفل الميزات سيتم بناؤها لاحقًا."
            )}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start with data, then build follow-up", "ابدأ بالبيانات، ثم ابنِ المتابعة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Try OrganHeal first, then see the value of deeper intelligence.",
                  "جرّب OrganHeal أولًا، ثم شاهد قيمة الذكاء الصحي الأعمق."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Start with a free assessment, upload a report when available, then open Intelligence and Health Plan to see the full value.",
                  "ابدأ بتقييم مجاني، ارفع تقريرًا عند توفره، ثم افتح الذكاء والخطة الصحية لرؤية القيمة الكاملة."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/signup" className="primaryBtn">
                {text("Create Free Account", "إنشاء حساب مجاني")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Report", "رفع تقرير")}
              </Link>

              <Link href="/health-plan" className="secondaryBtn">
                {text("Health Plan", "الخطة الصحية")}
              </Link>
            </div>
          </div>
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
      </div>
    </main>
  );
}
