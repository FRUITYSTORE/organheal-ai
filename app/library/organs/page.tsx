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
  // The dedicated educational reading page for this organ, if one has been
  // written yet. Only Heart has one today — leave the rest unset rather
  // than pointing "learn" copy at the assessment tool.
  learnHref?: string;
  // The interactive risk-assessment tool. Every organ has one.
  assessHref: string;
};

const organs: OrganLearningItem[] = [
  {
    name: "Heart",
    nameAr: "القلب",
    text: "Learn about cholesterol, blood pressure, circulation, and heart risk.",
    textAr:
      "تعرّف على الكوليسترول وضغط الدم والدورة الدموية وعوامل الخطورة المتعلقة بصحة القلب.",
    learnHref: "/library/organs/heart",
    assessHref: "/heart",
  },
  {
    name: "Kidney",
    nameAr: "الكلى",
    text: "Understand creatinine, eGFR, urine markers, hydration, and kidney signals.",
    textAr:
      "افهم الكرياتينين وeGFR ومؤشرات البول والترطيب والإشارات المرتبطة بصحة الكلى.",
    assessHref: "/kidney",
  },
  {
    name: "Liver",
    nameAr: "الكبد",
    text: "Learn about ALT, AST, bilirubin, liver function, and follow-up questions.",
    textAr:
      "تعرّف على ALT وAST والبيليروبين ووظائف الكبد والأسئلة المهمة للمتابعة.",
    assessHref: "/liver",
  },
  {
    name: "Lung",
    nameAr: "الرئتان",
    text: "Understand breathing, oxygen, symptoms, and respiratory health basics.",
    textAr:
      "افهم التنفس والأكسجين والأعراض والأساسيات المرتبطة بصحة الجهاز التنفسي.",
    assessHref: "/lung",
  },
  {
    name: "Brain",
    nameAr: "الدماغ",
    text: "Learn about sleep, mood, focus, headaches, and nervous system health.",
    textAr:
      "تعرّف على النوم والمزاج والتركيز والصداع وصحة الجهاز العصبي.",
    assessHref: "/brain",
  },
  {
    name: "Metabolic",
    nameAr: "الصحة الأيضية",
    text: "Understand glucose, HbA1c, weight, energy, and metabolic health patterns.",
    textAr:
      "افهم الجلوكوز وHbA1c والوزن والطاقة والأنماط المرتبطة بالصحة الأيضية.",
    assessHref: "/metabolic",
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
                    {organ.learnHref
                      ? text(
                          "Organ learning",
                          "التعلّم حسب العضو"
                        )
                      : text(
                          "Risk assessment",
                          "تقييم المخاطر"
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

                  <div
                    className="ohButtonRow"
                    style={{
                      marginTop: "18px",
                    }}
                  >
                    {organ.learnHref && (
                      <Link
                        href={organ.learnHref}
                        className="secondaryBtn"
                        style={{
                          justifyContent: "center",
                        }}
                      >
                        {text("Learn", "تعلّم")}
                      </Link>
                    )}

                    <Link
                      href={organ.assessHref}
                      className={
                        organ.learnHref
                          ? "secondaryBtn"
                          : "primaryBtn"
                      }
                      style={{
                        justifyContent: "center",
                      }}
                    >
                      {text(
                        `Check my ${organ.name}`,
                        `افحص ${organ.nameAr}`
                      )}
                    </Link>
                  </div>
                </article>
              );
            }
          )}
        </section>
      </PageLayout>
    </main>
  );
}
