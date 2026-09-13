"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PageLayout from "@/app/components/navigation/PageLayout";

type Language = "en" | "ar";

type DoctorPrepStep = {
  title: string;
  titleAr: string;
  text: string;
  textAr: string;
};

const prepSteps: DoctorPrepStep[] = [
  {
    title: "Know your main concern",
    titleAr: "حدد أهم ما يشغلك",
    text: "Write the one health question you most want answered.",
    textAr:
      "اكتب السؤال الصحي الأهم الذي تريد الحصول على إجابة واضحة عنه.",
  },
  {
    title: "Bring your recent reports",
    titleAr: "أحضر تقاريرك الحديثة",
    text: "Keep lab results, imaging reports, medications, and discharge summaries ready.",
    textAr:
      "جهّز نتائج المختبر وتقارير الأشعة وقائمة الأدوية وملخصات الخروج من المستشفى إن وجدت.",
  },
  {
    title: "Ask clear questions",
    titleAr: "اطرح أسئلة واضحة",
    text: "Focus on what changed, what it means, and what you should do next.",
    textAr:
      "ركّز على ما الذي تغيّر، وما الذي تعنيه النتائج، وما الخطوة التالية المناسبة.",
  },
  {
    title: "Confirm the follow-up plan",
    titleAr: "تأكد من خطة المتابعة",
    text: "Ask when to repeat tests, when to seek urgent help, and what signs to monitor.",
    textAr:
      "اسأل عن موعد إعادة الفحوصات، ومتى تحتاج إلى مساعدة عاجلة، وما العلامات التي يجب مراقبتها.",
  },
];

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar")
    ? "ar"
    : "en";
}

export default function DoctorPrepLearningPage() {
  const [language, setLanguage] =
    useState<Language>("en");

  const isArabic =
    language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage =
        getStoredLanguage();

      setLanguage(
        selectedLanguage
      );

      document.documentElement.lang =
        selectedLanguage;

      document.documentElement.dir =
        selectedLanguage === "ar"
          ? "rtl"
          : "ltr";
    }

    syncLanguage();

    window.addEventListener(
      "storage",
      syncLanguage
    );

    window.addEventListener(
      "organheal-language-change",
      syncLanguage
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncLanguage
      );

      window.removeEventListener(
        "organheal-language-change",
        syncLanguage
      );
    };
  }, []);

  function text(
    en: string,
    ar: string
  ) {
    return isArabic
      ? ar
      : en;
  }

  return (
    <main
      className="ohPageShell"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <PageLayout
        backHref="/library"
        backLabel={text(
          "← Back to Learning",
          "← العودة إلى مركز التعلّم"
        )}
        eyebrow={text(
          "Prepare for your doctor",
          "التحضير لزيارة الطبيب"
        )}
        title={text(
          "Go to your visit with clearer questions.",
          "اذهب إلى موعدك الطبي بأسئلة أوضح واستعداد أفضل."
        )}
        description={text(
          "OrganHeal helps you organize what to ask, what to bring, and what to confirm before leaving the clinic.",
          "يساعدك OrganHeal على تنظيم ما تريد سؤاله، وما يجب إحضاره، وما ينبغي التأكد منه قبل مغادرة العيادة."
        )}
      >
        <section className="ohGrid cols2">
          {prepSteps.map(
            (step, index) => (
              <article
                className="ohCard"
                key={step.title}
              >
                <p className="ohMetricLabel">
                  {text(
                    `Step ${index + 1}`,
                    `الخطوة ${index + 1}`
                  )}
                </p>

                <h2 className="ohCardTitle">
                  {isArabic
                    ? step.titleAr
                    : step.title}
                </h2>

                <p className="ohCardText">
                  {isArabic
                    ? step.textAr
                    : step.text}
                </p>
              </article>
            )
          )}
        </section>

        <section className="ohActionPanel">
          <div>
            <p className="ohMetricLabel">
              {text(
                "Use your health context",
                "استخدم سياقك الصحي"
              )}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Use your reports to prepare more useful questions.",
                "استخدم تقاريرك لتحضير أسئلة أكثر فائدة."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Review your saved reports, important findings, medications, and follow-up needs before your next visit.",
                "راجع تقاريرك المحفوظة والنتائج المهمة والأدوية واحتياجات المتابعة قبل موعدك القادم."
              )}
            </p>
          </div>

          <Link
            href="/reports"
            className="primaryBtn"
          >
            {text(
              "Open Reports",
              "فتح التقارير"
            )}
          </Link>
        </section>
      </PageLayout>
    </main>
  );
}