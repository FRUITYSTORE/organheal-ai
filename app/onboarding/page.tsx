"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

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

  const steps = [
    {
      icon: "🫀",
      title: text("Start with a health assessment", "ابدأ بتقييم صحي"),
      text: text(
        "The best first step is a quick organ health assessment so OrganHeal can build your first health profile.",
        "أفضل بداية هي تقييم سريع لصحة الأعضاء حتى يستطيع OrganHeal بناء أول صورة صحية لك."
      ),
      href: "/assessment",
      action: text("Start Assessment", "ابدأ التقييم"),
      primary: true,
    },
    {
      icon: "📄",
      title: text("Upload a medical report", "ارفع تقريرًا طبيًا"),
      text: text(
        "If you have lab results or a written medical report, upload it to generate clearer summaries inside your account.",
        "إذا كان لديك نتائج مختبر أو تقرير طبي مكتوب، ارفعه للحصول على ملخصات أوضح داخل حسابك."
      ),
      href: "/lab-upload",
      action: text("Upload Report", "رفع تقرير"),
      primary: false,
    },
    {
      icon: "🧠",
      title: text("Open Health Intelligence", "افتح مركز الذكاء الصحي"),
      text: text(
        "After adding data, open the Intelligence Center to view summaries, opportunities, and your follow-up direction.",
        "بعد إضافة بياناتك، افتح مركز الذكاء الصحي لعرض الملخصات، الفرص الصحية، واتجاه المتابعة."
      ),
      href: "/intelligence",
      action: text("Open Intelligence", "افتح المركز"),
      primary: false,
    },
  ];

  return (
    <main className="onboardingPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="onboardingHero">
        <p className="launchEyebrow">
          {text("Welcome to OrganHeal", "مرحبًا بك في OrganHeal")}
        </p>

        <h1>
          {loading
            ? text("Preparing your health journey...", "جاري تحضير رحلتك الصحية...")
            : text(`Welcome, ${username}`, `مرحبًا ${username}`)}
        </h1>

        <p>
          {text(
            "Choose the first step that fits you. You do not need to do everything now. Start with a simple assessment or upload a medical report when available.",
            "اختر أول خطوة مناسبة لك. لا تحتاج إلى فعل كل شيء الآن. ابدأ بتقييم بسيط أو ارفع تقريرًا طبيًا عندما يكون متاحًا."
          )}
        </p>
      </section>

      <section className="onboardingGrid">
        {steps.map((step) => (
          <article className="onboardingCard" key={step.title}>
            <div className="onboardingIcon">{step.icon}</div>
            <h2>{step.title}</h2>
            <p>{step.text}</p>

            <Link
              href={step.href}
              className={step.primary ? "launchPrimary" : "launchSecondary"}
            >
              {step.action}
            </Link>
          </article>
        ))}
      </section>

      <section className="onboardingNote">
        <div>
          <h2>
            {text(
              "What you get at the beginning",
              "ماذا تحصل عليه في البداية؟"
            )}
          </h2>

          <p>
            {text(
              "The free account helps you try assessments and basic report understanding. Later, Plus can support monthly follow-up, saved results, downloadable summaries, and health planning.",
              "الحساب المجاني يساعدك على تجربة التقييمات وفهم التقارير بشكل أولي. لاحقًا يمكن تطوير Plus لدعم المتابعة الشهرية، حفظ النتائج، تحميل الملخصات، والخطة الصحية."
            )}
          </p>
        </div>

        <div className="onboardingLinks">
          <Link href="/dashboard">
            {text("Go to Dashboard", "الذهاب إلى لوحة التحكم")}
          </Link>

          <Link href="/pricing">
            {text("View Plans", "عرض الخطط")}
          </Link>

          <Link href="/medical-disclaimer">
            {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
          </Link>
        </div>
      </section>
    </main>
  );
}
