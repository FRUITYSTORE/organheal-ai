"use client";

import Link from "next/link";

import NavIcon, { type NavIconName } from "@/app/components/navigation/NavIcons";
import { USAGE_POLICIES } from "@/lib/billing/usage-limits";

import "./home-sections.css";

type Localized = { en: string; ar: string };

function pick(value: Localized, isArabic: boolean): string {
  return isArabic ? value.ar : value.en;
}

const VISITOR_QUESTIONS = USAGE_POLICIES.assistant.visitor?.limit ?? 0;
const FREE_QUESTIONS = USAGE_POLICIES.assistant.free?.limit ?? 0;
const FREE_LIVE_VOICE = USAGE_POLICIES.voice_realtime.free?.limit ?? 0;

/** Note under the visitor's main call to action. */
export function VisitorFreeNote({ isArabic }: { isArabic: boolean }) {
  return (
    <p className="homeFreeNote">
      {isArabic
        ? `بدون بطاقة بنكية. اسأل ${VISITOR_QUESTIONS} أسئلة مجانًا كل يوم دون حساب.`
        : `No card needed. Ask ${VISITOR_QUESTIONS} questions a day free, no account required.`}
    </p>
  );
}

type LaunchAction = {
  href: string;
  icon: NavIconName;
  title: Localized;
  description: Localized;
};

const LAUNCH_ACTIONS: LaunchAction[] = [
  {
    href: "/lab-upload",
    icon: "reports",
    title: { en: "Upload a report", ar: "ارفع تقريرًا" },
    description: {
      en: "Add a new lab result",
      ar: "أضف نتيجة مختبر جديدة",
    },
  },
  {
    href: "/dashboard",
    icon: "dashboard",
    title: { en: "My health", ar: "صحتي" },
    description: {
      en: "Your map and what changed",
      ar: "خريطتك وما الذي تغيّر",
    },
  },
  {
    href: "/reports",
    icon: "history",
    title: { en: "My reports", ar: "تقاريري" },
    description: {
      en: "Everything you uploaded",
      ar: "كل ما رفعته",
    },
  },
  {
    href: "/doctor-portal",
    icon: "stethoscope",
    title: { en: "Doctor brief", ar: "ملخص الطبيب" },
    description: {
      en: "Get ready for your visit",
      ar: "استعد لزيارتك",
    },
  },
];

/** The member's shortcuts: the four places they come back to most. */
export function MemberLaunchGrid({ isArabic }: { isArabic: boolean }) {
  return (
    <nav
      className="homeLaunchGrid"
      aria-label={isArabic ? "إجراءات سريعة" : "Quick actions"}
    >
      {LAUNCH_ACTIONS.map((action) => (
        <Link className="homeLaunchTile" href={action.href} key={action.href}>
          <span className="homeLaunchIcon" aria-hidden="true">
            <NavIcon name={action.icon} size={22} />
          </span>
          <strong>{pick(action.title, isArabic)}</strong>
          <small>{pick(action.description, isArabic)}</small>
        </Link>
      ))}
    </nav>
  );
}

const STEPS: { title: Localized; description: Localized }[] = [
  {
    title: { en: "Upload or ask", ar: "ارفع أو اسأل" },
    description: {
      en: "Add a lab report, or just type a health question in your own words.",
      ar: "أضف تقرير مختبر، أو اكتب سؤالك الصحي بكلماتك.",
    },
  },
  {
    title: { en: "Understand", ar: "افهم" },
    description: {
      en: "See what each result means in plain language, and what changed over time.",
      ar: "اعرف معنى كل نتيجة بلغة واضحة، وما الذي تغيّر مع الوقت.",
    },
  },
  {
    title: { en: "Prepare for your doctor", ar: "استعد لطبيبك" },
    description: {
      en: "Get a doctor-ready summary and the questions worth asking.",
      ar: "احصل على ملخص جاهز للطبيب والأسئلة التي تستحق أن تُطرح.",
    },
  },
];

export function HomeHowItWorks({ isArabic }: { isArabic: boolean }) {
  return (
    <section className="homeBlock" id="how-it-works">
      <p className="homeBlockEyebrow">
        {isArabic ? "كيف يعمل" : "How it works"}
      </p>
      <h2 className="homeBlockTitle">
        {isArabic
          ? "ثلاث خطوات من التقرير إلى الفهم."
          : "Three steps from report to understanding."}
      </h2>

      <ol className="homeSteps">
        {STEPS.map((step, index) => (
          <li className="homeStep" key={step.title.en}>
            <span className="homeStepNumber" aria-hidden="true">
              {index + 1}
            </span>
            <h3>{pick(step.title, isArabic)}</h3>
            <p>{pick(step.description, isArabic)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomeAccessOverview({ isArabic }: { isArabic: boolean }) {
  const withoutAccount: Localized[] = [
    {
      en: `Ask up to ${VISITOR_QUESTIONS} questions a day`,
      ar: `اسأل حتى ${VISITOR_QUESTIONS} أسئلة كل يوم`,
    },
    { en: "Read the health library", ar: "تصفّح المكتبة الصحية" },
    { en: "Explore the sample health map", ar: "استكشف نموذج الخريطة الصحية" },
  ];

  const freeAccount: Localized[] = [
    {
      en: "Upload and organize your reports",
      ar: "ارفع تقاريرك ونظّمها",
    },
    {
      en: "Your private health map and history",
      ar: "خريطتك وسجلك الصحي الخاصان",
    },
    {
      en: `Up to ${FREE_QUESTIONS} questions a day about your own results`,
      ar: `حتى ${FREE_QUESTIONS} سؤالًا كل يوم عن نتائجك`,
    },
    {
      en: `Voice input, read-aloud and ${FREE_LIVE_VOICE} live voice chats a day`,
      ar: `الإدخال الصوتي والقراءة بصوت عالٍ و${FREE_LIVE_VOICE} محادثات صوتية مباشرة يوميًا`,
    },
  ];

  const plus: Localized[] = [
    {
      en: "Deeper analysis across many reports",
      ar: "تحليل أعمق عبر عدة تقارير",
    },
    {
      en: "Advanced doctor-ready summaries",
      ar: "ملخصات متقدمة جاهزة للطبيب",
    },
    { en: "Higher daily limits", ar: "حدود يومية أعلى" },
  ];

  const columns = [
    {
      key: "visitor",
      label: { en: "Without an account", ar: "بدون حساب" },
      badge: { en: "Try it now", ar: "جرّب الآن" },
      items: withoutAccount,
    },
    {
      key: "free",
      label: { en: "Free account", ar: "حساب مجاني" },
      badge: { en: "Recommended", ar: "الأنسب للبدء" },
      items: freeAccount,
    },
    {
      key: "plus",
      label: { en: "OrganHeal Plus", ar: "OrganHeal Plus" },
      badge: { en: "Coming soon", ar: "قريبًا" },
      items: plus,
    },
  ];

  return (
    <section className="homeBlock" aria-labelledby="homeAccessTitle">
      <p className="homeBlockEyebrow">
        {isArabic ? "ماذا تحصل عليه" : "What you get"}
      </p>
      <h2 className="homeBlockTitle" id="homeAccessTitle">
        {isArabic
          ? "ابدأ دون حساب، وأنشئ حسابك المجاني حين تريد المزيد."
          : "Start without an account. Create a free one when you want more."}
      </h2>

      <div className="homeAccessGrid">
        {columns.map((column) => (
          <article
            className={`homeAccessCard${column.key === "free" ? " homeAccessCardFeatured" : ""}`}
            key={column.key}
          >
            <header>
              <h3>{pick(column.label, isArabic)}</h3>
              <span className="homeAccessBadge">
                {pick(column.badge, isArabic)}
              </span>
            </header>

            <ul>
              {column.items.map((item) => (
                <li key={item.en}>{pick(item, isArabic)}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeFinalCta({ isArabic }: { isArabic: boolean }) {
  return (
    <section className="homeFinalCta">
      <div>
        <h2>
          {isArabic
            ? "ابدأ بفهم صحتك اليوم."
            : "Start understanding your health today."}
        </h2>
        <p>
          {isArabic
            ? "أنشئ حسابك المجاني في أقل من دقيقة، وارفع أول تقرير."
            : "Create your free account in under a minute and upload your first report."}
        </p>
      </div>

      <div className="homeFinalCtaActions">
        <Link href="/signup" className="primaryBtn">
          {isArabic ? "ابدأ مجانًا" : "Start Free"}
        </Link>
        <Link href="#ask-organheal" className="secondaryBtn">
          {isArabic ? "اسأل أولًا" : "Ask a question first"}
        </Link>
      </div>
    </section>
  );
}
