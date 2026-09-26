"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DigitalTwinCard from "@/app/intelligence/components/DigitalTwinCard";
import { openHealthChat } from "@/lib/health-updates/chat-events";

import "./demo.css";

type Language = "en" | "ar";
type Status = "normal" | "review";

type Marker = {
  key: string;
  name: { en: string; ar: string };
  value: string;
  range: { en: string; ar: string };
  status: Status;
  meaning: { en: string; ar: string };
};

const MARKERS: Marker[] = [
  {
    key: "ldl",
    name: { en: "LDL cholesterol", ar: "الكوليسترول الضار LDL" },
    value: "162 mg/dL",
    range: { en: "Typical goal: under 130", ar: "الهدف المعتاد: أقل من 130" },
    status: "review",
    meaning: {
      en: "Higher than the usual goal. Diet, activity and sometimes medicine can bring it down — worth discussing with your doctor.",
      ar: "أعلى من الهدف المعتاد. الغذاء والنشاط وأحيانًا الدواء تخفضه، ويستحق النقاش مع طبيبك.",
    },
  },
  {
    key: "hba1c",
    name: { en: "HbA1c (average blood sugar)", ar: "السكر التراكمي HbA1c" },
    value: "5.9 %",
    range: { en: "Typical: under 5.7", ar: "الطبيعي: أقل من 5.7" },
    status: "review",
    meaning: {
      en: "In the range doctors call prediabetes (5.7–6.4%). This is a signal to act early — small lifestyle changes matter a lot here.",
      ar: "ضمن المدى الذي يسميه الأطباء ما قبل السكري (5.7–6.4%). إشارة للتحرك مبكرًا، والتغييرات الصغيرة في نمط الحياة تفرق كثيرًا.",
    },
  },
  {
    key: "vitd",
    name: { en: "Vitamin D", ar: "فيتامين د" },
    value: "22 ng/mL",
    range: { en: "Typical: 30 or more", ar: "الطبيعي: 30 فأكثر" },
    status: "review",
    meaning: {
      en: "A little low. Sunlight, food and sometimes supplements help — ask your doctor before starting one.",
      ar: "منخفض قليلًا. الشمس والغذاء وأحيانًا المكملات تساعد، واسأل طبيبك قبل البدء بمكمل.",
    },
  },
  {
    key: "creatinine",
    name: { en: "Creatinine (kidney marker)", ar: "الكرياتينين (مؤشر الكلى)" },
    value: "0.9 mg/dL",
    range: { en: "Typical: 0.6–1.2", ar: "الطبيعي: 0.6–1.2" },
    status: "normal",
    meaning: {
      en: "Within the typical range — a reassuring sign for kidney function.",
      ar: "ضمن المدى المعتاد، وهي إشارة مطمئنة لوظائف الكلى.",
    },
  },
  {
    key: "hemoglobin",
    name: { en: "Hemoglobin", ar: "الهيموغلوبين" },
    value: "14.2 g/dL",
    range: { en: "Typical: 13.5–17.5", ar: "الطبيعي: 13.5–17.5" },
    status: "normal",
    meaning: {
      en: "Normal. No sign of anemia in this result.",
      ar: "طبيعي. لا توجد إشارة إلى فقر الدم في هذه النتيجة.",
    },
  },
];

const QUESTIONS: { en: string; ar: string }[] = [
  {
    en: "Should I repeat my LDL and HbA1c, and when?",
    ar: "هل أعيد فحص LDL والسكر التراكمي، ومتى؟",
  },
  {
    en: "Which lifestyle changes would help most for my numbers?",
    ar: "أي تغييرات في نمط حياتي ستفيد أرقامي أكثر؟",
  },
  {
    en: "Do I need a vitamin D supplement, and what dose?",
    ar: "هل أحتاج مكمل فيتامين د، وما الجرعة؟",
  },
];

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function DemoPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";
  const text = (en: string, ar: string) => (isArabic ? ar : en);

  useEffect(() => {
    function sync() {
      const selected = getStoredLanguage();

      setLanguage(selected);
      document.documentElement.lang = selected;
      document.documentElement.dir = selected === "ar" ? "rtl" : "ltr";
    }

    const timer = window.setTimeout(sync, 0);

    window.addEventListener("storage", sync);
    window.addEventListener("organheal-language-change", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("organheal-language-change", sync);
    };
  }, []);

  return (
    <main className="ohPageShell demoPage" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header className="demoHero">
        <p className="ohEyebrow">{text("Sample report · no sign-up", "تقرير تجريبي · دون تسجيل")}</p>
        <h1>{text("See what OrganHeal does with a lab report", "شاهد ما يفعله OrganHeal بتقرير مختبر")}</h1>
        <p>
          {text(
            "Here is a sample blood test, explained in plain language in seconds. Your own report gets the same treatment — privately, in your account.",
            "هذا تحليل دم تجريبي، مشروح بلغة بسيطة خلال ثوانٍ. تقريرك أنت يحصل على المعاملة نفسها، بخصوصية داخل حسابك."
          )}
        </p>

        <div className="demoHeroActions">
          <Link href="/signup" className="primaryBtn">
            {text("Analyze my own report free", "حلّل تقريري مجانًا")}
          </Link>
          <button type="button" className="secondaryBtn" onClick={() => openHealthChat(text("Explain HbA1c 5.9% in simple words", "اشرح لي السكر التراكمي 5.9% ببساطة"))}>
            {text("Ask a question about this sample", "اسأل عن هذا المثال")}
          </button>
        </div>
      </header>

      <section className="demoBlock" aria-labelledby="demoResults">
        <h2 id="demoResults">{text("Your results, translated", "نتائجك بلغة مفهومة")}</h2>

        <ul className="demoMarkers">
          {MARKERS.map((marker) => (
            <li key={marker.key} className="demoMarker" data-status={marker.status}>
              <div className="demoMarkerTop">
                <strong>{isArabic ? marker.name.ar : marker.name.en}</strong>
                <span className="demoMarkerValue">{marker.value}</span>
                <span className="demoBadge">
                  {marker.status === "normal" ? text("In range", "ضمن المدى") : text("Worth reviewing", "يستحق المراجعة")}
                </span>
              </div>
              <small>{isArabic ? marker.range.ar : marker.range.en}</small>
              <p>{isArabic ? marker.meaning.ar : marker.meaning.en}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="demoColumns">
        <section className="demoBlock" aria-labelledby="demoMap">
          <h2 id="demoMap">{text("Your health map", "خريطتك الصحية")}</h2>
          <DigitalTwinCard
            isArabic={isArabic}
            digitalTwin={{
              liverRisk: 12,
              cardiovascularRisk: 48,
              kidneyRisk: 14,
              metabolicRisk: 44,
              recoveryPotential: 68,
              primarySystem: "Metabolic Health",
              profileSummary: text(
                "Sample data. Main focus: metabolic and heart health.",
                "بيانات توضيحية. مجال التركيز: الصحة الأيضية وصحة القلب."
              ),
            }}
          />
        </section>

        <section className="demoBlock" aria-labelledby="demoDoctor">
          <h2 id="demoDoctor">{text("Questions for your doctor", "أسئلة لطبيبك")}</h2>
          <ol className="demoQuestions">
            {QUESTIONS.map((question) => (
              <li key={question.en}>{isArabic ? question.ar : question.en}</li>
            ))}
          </ol>
          <p className="demoNote">
            {text(
              "With an account, this becomes a one-page doctor brief you can print or share before your visit.",
              "مع الحساب يتحول هذا إلى ملخص من صفحة واحدة للطبيب يمكنك طباعته أو مشاركته قبل موعدك."
            )}
          </p>
        </section>
      </div>

      <section className="demoCta">
        <h2>{text("Ready for your own results?", "جاهز لنتائجك أنت؟")}</h2>
        <p>{text("Free to start, private by design, in English and Arabic.", "مجاني للبدء، وخصوصية بالتصميم، بالعربية والإنجليزية.")}</p>
        <Link href="/signup" className="primaryBtn">
          {text("Create my free account", "أنشئ حسابي المجاني")}
        </Link>
      </section>

      <p className="demoDisclaimer">
        {text(
          "All values on this page are fictional sample data for illustration. OrganHeal provides educational information and does not replace a doctor.",
          "كل القيم في هذه الصفحة بيانات تجريبية خيالية للتوضيح. يقدم OrganHeal معلومات تثقيفية ولا يحل محل الطبيب."
        )}
      </p>
    </main>
  );
}
