"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

export default function OnboardingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    loadUser();

    return () => clearInterval(interval);
  }, []);

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

  const isArabic = language === "ar";

  const steps = isArabic
    ? [
        {
          icon: "🫀",
          title: "ابدأ بتقييم صحي",
          text: "أفضل بداية هي تقييم سريع لصحة الأعضاء حتى يبني OrganHeal صورة أولية عن صحتك.",
          href: "/assessment",
          action: "ابدأ التقييم",
          primary: true,
        },
        {
          icon: "📄",
          title: "ارفع تقريرًا طبيًا",
          text: "إذا لديك تحاليل أو تقرير طبي مكتوب، ارفعه للحصول على ملخص أوضح داخل حسابك.",
          href: "/lab-upload",
          action: "ارفع تقريرًا",
          primary: false,
        },
        {
          icon: "🧠",
          title: "افتح مركز الذكاء الصحي",
          text: "بعد إضافة بياناتك، افتح مركز الذكاء الصحي لرؤية الملخصات والفرص الصحية والخطة.",
          href: "/intelligence",
          action: "افتح المركز",
          primary: false,
        },
      ]
    : [
        {
          icon: "🫀",
          title: "Start with a health assessment",
          text: "The best first step is a quick organ health assessment so OrganHeal can build your first health profile.",
          href: "/assessment",
          action: "Start Assessment",
          primary: true,
        },
        {
          icon: "📄",
          title: "Upload a medical report",
          text: "If you have lab results or a written medical report, upload it to generate clearer summaries inside your account.",
          href: "/lab-upload",
          action: "Upload Report",
          primary: false,
        },
        {
          icon: "🧠",
          title: "Open Health Intelligence",
          text: "After adding data, open the Intelligence Center to view summaries, opportunities, and your follow-up direction.",
          href: "/intelligence",
          action: "Open Intelligence",
          primary: false,
        },
      ];

  return (
    <main className="onboardingPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="onboardingHero">
        <p className="launchEyebrow">
          {isArabic ? "مرحبًا بك في OrganHeal" : "Welcome to OrganHeal"}
        </p>

        <h1>
          {loading
            ? isArabic
              ? "نجهّز رحلتك الصحية..."
              : "Preparing your health journey..."
            : isArabic
            ? `مرحبًا ${username}`
            : `Welcome, ${username}`}
        </h1>

        <p>
          {isArabic
            ? "اختر أول خطوة مناسبة لك. لا تحتاج أن تفعل كل شيء الآن. ابدأ بتقييم بسيط أو ارفع تقريرًا طبيًا عندما يكون متاحًا."
            : "Choose the first step that fits you. You do not need to do everything now. Start with a simple assessment or upload a medical report when available."}
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
            {isArabic
              ? "ماذا تحصل عليه في البداية؟"
              : "What you get at the beginning"}
          </h2>

          <p>
            {isArabic
              ? "الحساب المجاني يساعدك على تجربة التقييمات وفهم التقارير بشكل أولي. لاحقًا يمكن تطوير Plus للمتابعة الشهرية، حفظ النتائج، التقارير القابلة للتحميل، والخطة الصحية."
              : "The free account helps you try assessments and basic report understanding. Later, Plus can support monthly follow-up, saved results, downloadable summaries, and health planning."}
          </p>
        </div>

        <div className="onboardingLinks">
          <Link href="/dashboard">
            {isArabic ? "الذهاب إلى Dashboard" : "Go to Dashboard"}
          </Link>

          <Link href="/pricing">
            {isArabic ? "عرض الخطط" : "View Plans"}
          </Link>

          <Link href="/medical-disclaimer">
            {isArabic ? "إخلاء المسؤولية الطبية" : "Medical Disclaimer"}
          </Link>
        </div>
      </section>
    </main>
  );
}