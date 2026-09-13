"use client";

import { useEffect, useState } from "react";

import PageLayout from "@/app/components/navigation/PageLayout";

type Language = "en" | "ar";

type ReportLearningStep = {
  title: string;
  titleAr: string;
  text: string;
  textAr: string;
};

const reportLearningSteps: ReportLearningStep[] = [
  {
    title: "Find the key result",
    titleAr: "حدد النتيجة الأهم",
    text: "Start with the marker or finding that looks most important or abnormal.",
    textAr:
      "ابدأ بالمؤشر أو النتيجة التي تبدو أكثر أهمية أو غير طبيعية في التقرير.",
  },
  {
    title: "Understand what it means",
    titleAr: "افهم ما تعنيه النتيجة",
    text: "Learn what the result may suggest and why one number is not enough alone.",
    textAr:
      "تعرّف على ما قد تشير إليه النتيجة ولماذا لا تكفي قراءة رقم واحد بمفرده.",
  },
  {
    title: "Connect it to your body",
    titleAr: "اربط النتيجة بصحتك",
    text: "Relate the result to organs, symptoms, lifestyle, and follow-up needs.",
    textAr:
      "اربط النتيجة بأجهزة الجسم والأعراض ونمط الحياة واحتياجات المتابعة.",
  },
  {
    title: "Prepare your next question",
    titleAr: "حضّر سؤالك التالي",
    text: "Turn the report into clear questions for your doctor or next visit.",
    textAr:
      "حوّل ما وجدته في التقرير إلى أسئلة واضحة للطبيب أو للزيارة القادمة.",
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

export default function ReportLearningPage() {
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
          "Understand my report",
          "فهم تقريري"
        )}
        title={text(
          "Turn your report into clear learning steps.",
          "حوّل تقريرك إلى خطوات واضحة تساعدك على فهمه."
        )}
        description={text(
          "OrganHeal helps you move from uploaded reports to simple explanations, related topics, and better questions for your doctor.",
          "يساعدك OrganHeal على الانتقال من التقرير المرفوع إلى شرح مبسط وموضوعات مرتبطة وأسئلة أفضل للطبيب."
        )}
        actions={[
          {
            href: "/reports",
            label: text(
              "Open My Reports",
              "فتح تقاريري"
            ),
          },
          {
            href: "/lab-upload",
            label: text(
              "Upload Report",
              "رفع تقرير"
            ),
            variant: "secondary",
          },
        ]}
      >
        <section className="ohGrid cols2">
          {reportLearningSteps.map(
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
                "Personalized learning",
                "تعلّم مخصص"
              )}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Connect report learning with your personal health context.",
                "اربط فهم التقرير بسياقك الصحي الشخصي."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Use your saved reports and OrganHeal analysis to understand relevant markers, follow trends, and prepare more useful follow-up questions.",
                "استخدم تقاريرك المحفوظة وتحليل OrganHeal لفهم المؤشرات المهمة ومتابعة الاتجاهات وتحضير أسئلة أكثر فائدة للمتابعة."
              )}
            </p>
          </div>
        </section>
      </PageLayout>
    </main>
  );
}