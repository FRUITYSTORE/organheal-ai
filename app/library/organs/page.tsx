"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PageLayout from "@/app/components/navigation/PageLayout";

type Language = "en" | "ar";

type OrganLearningItem = {
  name: string;
  nameAr: string;
  text: string;
  textAr: string;
  href: string;
};

const organs: OrganLearningItem[] = [
  {
    name: "Heart",
    nameAr: "القلب",
    text: "Learn about cholesterol, blood pressure, circulation, and heart risk.",
    textAr:
      "تعرّف على الكوليسترول وضغط الدم والدورة الدموية وعوامل الخطورة المتعلقة بصحة القلب.",
    href: "/library/organs/heart",
  },
  {
    name: "Kidney",
    nameAr: "الكلى",
    text: "Understand creatinine, eGFR, urine markers, hydration, and kidney signals.",
    textAr:
      "افهم الكرياتينين وeGFR ومؤشرات البول والترطيب والإشارات المرتبطة بصحة الكلى.",
    href: "/kidney",
  },
  {
    name: "Liver",
    nameAr: "الكبد",
    text: "Learn about ALT, AST, bilirubin, liver function, and follow-up questions.",
    textAr:
      "تعرّف على ALT وAST والبيليروبين ووظائف الكبد والأسئلة المهمة للمتابعة.",
    href: "/liver",
  },
  {
    name: "Lung",
    nameAr: "الرئتان",
    text: "Understand breathing, oxygen, symptoms, and respiratory health basics.",
    textAr:
      "افهم التنفس والأكسجين والأعراض والأساسيات المرتبطة بصحة الجهاز التنفسي.",
    href: "/lung",
  },
  {
    name: "Brain",
    nameAr: "الدماغ",
    text: "Learn about sleep, mood, focus, headaches, and nervous system health.",
    textAr:
      "تعرّف على النوم والمزاج والتركيز والصداع وصحة الجهاز العصبي.",
    href: "/brain",
  },
  {
    name: "Metabolic",
    nameAr: "الصحة الأيضية",
    text: "Understand glucose, HbA1c, weight, energy, and metabolic health patterns.",
    textAr:
      "افهم الجلوكوز وHbA1c والوزن والطاقة والأنماط المرتبطة بالصحة الأيضية.",
    href: "/metabolic",
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

export default function OrganLearningPage() {
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
          "Body systems & organs",
          "أجهزة الجسم والأعضاء"
        )}
        title={text(
          "Choose the body system you want to understand.",
          "اختر جهاز الجسم أو العضو الذي تريد فهمه."
        )}
        description={text(
          "Explore organ-specific learning when a body-system view is useful. Each area connects health concepts with relevant lab markers, reports, and useful questions.",
          "استكشف المحتوى الصحي حسب العضو عندما يكون العرض حسب أجهزة الجسم مفيدًا. يربط كل قسم المفاهيم الصحية بمؤشرات المختبر والتقارير والأسئلة المهمة."
        )}
      >
        <section className="ohGrid cols3">
          {organs.map(
            (organ) => {
              const organName =
                isArabic
                  ? organ.nameAr
                  : organ.name;

              return (
                <article
                  className="ohCard"
                  key={organ.name}
                >
                  <p className="ohMetricLabel">
                    {text(
                      "Organ learning",
                      "التعلّم حسب العضو"
                    )}
                  </p>

                  <h2 className="ohCardTitle">
                    {organName}
                  </h2>

                  <p className="ohCardText">
                    {isArabic
                      ? organ.textAr
                      : organ.text}
                  </p>

                  <Link
                    href={organ.href}
                    className="secondaryBtn"
                    style={{
                      marginTop: "18px",
                      justifyContent: "center",
                    }}
                  >
                    {text(
                      `Open ${organ.name}`,
                      `فتح ${organ.nameAr}`
                    )}
                  </Link>
                </article>
              );
            }
          )}
        </section>
      </PageLayout>
    </main>
  );
}