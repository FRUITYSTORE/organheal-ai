"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type OnboardingStep = {
  icon: string;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  action: string;
  primary: boolean;
};

export default function OnboardingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    loadUser();

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

  async function loadUser() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    setUsername(profile?.username || userData.user.email || "User");
    setLoading(false);
  }

  const steps: OnboardingStep[] = [
    {
      icon: "🫀",
      eyebrow: text("Step 1", "الخطوة 1"),
      title: text("Start with a health assessment", "ابدأ بتقييم صحي"),
      text: text(
        "Create your first organ health score so OrganHeal can begin building your personal health picture.",
        "أنشئ أول مؤشر لصحة الأعضاء حتى يبدأ OrganHeal ببناء صورتك الصحية الشخصية."
      ),
      href: "/assessment",
      action: text("Start Assessment", "ابدأ التقييم"),
      primary: true,
    },
    {
      icon: "📄",
      eyebrow: text("Step 2", "الخطوة 2"),
      title: text("Upload a medical report", "ارفع تقريرًا طبيًا"),
      text: text(
        "Add lab results, radiology reports, discharge summaries, or medical documents when available.",
        "أضف نتائج المختبر، تقارير الأشعة، ملخصات الخروج، أو المستندات الطبية عند توفرها."
      ),
      href: "/lab-upload",
      action: text("Upload Report", "رفع تقرير"),
      primary: false,
    },
    {
      icon: "🧠",
      eyebrow: text("Step 3", "الخطوة 3"),
      title: text("Open Health Intelligence", "افتح مركز الذكاء الصحي"),
      text: text(
        "Turn assessments and reports into summaries, opportunities, and a clearer follow-up direction.",
        "حوّل التقييمات والتقارير إلى ملخصات، فرص صحية، واتجاه متابعة أوضح."
      ),
      href: "/intelligence",
      action: text("Open Intelligence", "افتح المركز"),
      primary: false,
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Welcome to OrganHeal", "مرحبًا بك في OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {loading
                  ? text(
                      "Preparing your health journey...",
                      "جاري تحضير رحلتك الصحية..."
                    )
                  : text(`Welcome, ${username}`, `مرحبًا ${username}`)}
              </h1>

              <p className="ohLead">
                {text(
                  "Choose the first step that fits you. You do not need to do everything now. Start with a simple assessment, upload a report when available, then unlock your Health Intelligence Center.",
                  "اختر أول خطوة مناسبة لك. لا تحتاج إلى فعل كل شيء الآن. ابدأ بتقييم بسيط، ارفع تقريرًا عند توفره، ثم افتح مركز الذكاء الصحي."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Go to Dashboard", "الذهاب إلى لوحة التحكم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Launch Path", "مسار البداية")}
                  </p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Your first 3 actions",
                      "أول 3 خطوات لك"
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Ready", "جاهز")}
                </span>
              </div>

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Create first score", "إنشاء أول مؤشر")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Start with one organ assessment.", "ابدأ بتقييم عضو واحد.")}
                    </p>
                  </div>
                  <span className="ohStatusBadge neutral">1</span>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Add health evidence", "إضافة بيانات صحية")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Upload reports when available.", "ارفع التقارير عند توفرها.")}
                    </p>
                  </div>
                  <span className="ohStatusBadge neutral">2</span>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Generate intelligence", "توليد الذكاء الصحي")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Connect data to next steps.", "اربط البيانات بالخطوات التالية.")}
                    </p>
                  </div>
                  <span className="ohStatusBadge neutral">3</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Start Time", "وقت البداية")}
            </span>
            <span className="ohMetricValue">3</span>
            <span className="ohMetricHint">
              {text("minutes for first assessment", "دقائق لأول تقييم")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health Areas", "المجالات الصحية")}
            </span>
            <span className="ohMetricValue">6</span>
            <span className="ohMetricHint">
              {text("organ-focused modules", "وحدات مخصصة للأعضاء")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Saved Journey", "رحلة محفوظة")}
            </span>
            <span className="ohMetricValue">✓</span>
            <span className="ohMetricHint">
              {text("timeline and profile ready", "المسار والملف جاهزان")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Next Layer", "الطبقة التالية")}
            </span>
            <span className="ohMetricValue">AI</span>
            <span className="ohMetricHint">
              {text("health intelligence center", "مركز الذكاء الصحي")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols3">
          {steps.map((step) => (
            <article className="ohCard" key={step.title}>
              <div className="ohCardHeader">
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "18px",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--oh-primary-soft)",
                    fontSize: "1.75rem",
                  }}
                >
                  {step.icon}
                </div>

                <span className={step.primary ? "ohStatusBadge good" : "ohStatusBadge neutral"}>
                  {step.eyebrow}
                </span>
              </div>

              <h2 className="ohCardTitle">{step.title}</h2>
              <p className="ohCardText">{step.text}</p>

              <div className="ohDivider" />

              <Link
                href={step.href}
                className={step.primary ? "primaryBtn" : "secondaryBtn"}
              >
                {step.action}
              </Link>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Best First Move", "أفضل خطوة أولى")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                {text(
                  "Start simple, then build your health intelligence",
                  "ابدأ ببساطة، ثم ابنِ ذكاءك الصحي"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "One assessment is enough to begin. You can add reports, check-ins, and intelligence results later as your health journey grows.",
                  "تقييم واحد يكفي للبدء. يمكنك إضافة التقارير، Check-Ins، ونتائج الذكاء الصحي لاحقًا مع تطور رحلتك الصحية."
                )}
              </p>
            </div>

            <Link href="/assessment" className="primaryBtn">
              {text("Begin Now", "ابدأ الآن")}
            </Link>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("What you get at the beginning", "ماذا تحصل عليه في البداية؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "A clear health starting point",
                  "نقطة بداية صحية واضحة"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The free account helps you try assessments and basic report understanding. Later, Plus can support monthly follow-up, saved results, downloadable summaries, and health planning.",
                  "الحساب المجاني يساعدك على تجربة التقييمات وفهم التقارير بشكل أولي. لاحقًا يمكن تطوير Plus لدعم المتابعة الشهرية، حفظ النتائج، تحميل الملخصات، والخطة الصحية."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/dashboard" className="secondaryBtn">
              {text("Go to Dashboard", "الذهاب إلى لوحة التحكم")}
            </Link>

            <Link href="/pricing" className="secondaryBtn">
              {text("View Plans", "عرض الخطط")}
            </Link>

            <Link href="/medical-disclaimer" className="secondaryBtn">
              {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
            </Link>
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
              "OrganHeal helps organize health information for education and follow-up preparation. It does not replace diagnosis, treatment, urgent care, or emergency medical services.",
              "يساعد OrganHeal على تنظيم المعلومات الصحية للتعليم والتحضير للمتابعة. لا يستبدل التشخيص أو العلاج أو الرعاية العاجلة أو خدمات الطوارئ الطبية."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
