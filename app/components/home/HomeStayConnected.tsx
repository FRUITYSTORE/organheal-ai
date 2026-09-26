"use client";

import Link from "next/link";

import "./home-today.css";

type Channel = {
  key: "whatsapp" | "email" | "app";
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: React.ReactNode;
  live: boolean;
};

const WHATSAPP_LIVE = process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";

const stroke = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const CHANNELS: Channel[] = [
  {
    key: "whatsapp",
    title: { en: "WhatsApp follow-up", ar: "متابعة عبر واتساب" },
    description: {
      en: "Get gentle check-ins about your results and health questions right in WhatsApp.",
      ar: "استقبل متابعات لطيفة عن نتائجك وأسئلتك الصحية مباشرة على واتساب.",
    },
    icon: (
      <svg {...stroke}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M9.5 9.5c.3 2 2 3.7 4 4l1-1.2-1.6-.9-.7.6a3 3 0 0 1-1.3-1.3l.6-.7-.9-1.6-1.1 1.1Z" />
      </svg>
    ),
    live: WHATSAPP_LIVE,
  },
  {
    key: "email",
    title: { en: "Email summaries", ar: "ملخصات بالبريد" },
    description: {
      en: "Receive follow-up reminders and important updates in your inbox, in your language.",
      ar: "استقبل تذكيرات المتابعة والتحديثات المهمة في بريدك، بلغتك.",
    },
    icon: (
      <svg {...stroke}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
    live: true,
  },
  {
    key: "app",
    title: { en: "In-app alerts", ar: "تنبيهات داخل الموقع" },
    description: {
      en: "The bell keeps your follow-ups and answers in one place, in English and Arabic.",
      ar: "الجرس يجمع متابعاتك وإجاباتك في مكان واحد، بالعربية والإنجليزية.",
    },
    icon: (
      <svg {...stroke}>
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    ),
    live: true,
  },
];

export default function HomeStayConnected({
  isArabic,
  isLoggedIn,
}: {
  isArabic: boolean;
  isLoggedIn: boolean;
}) {
  const href = isLoggedIn ? "/settings/communications" : "/signup";

  return (
    <section
      className="ohConnect"
      aria-label={isArabic ? "ابقَ على تواصل مع صحتك" : "Stay connected with your health"}
    >
      <header className="ohConnectHeader">
        <p className="ohEyebrow">{isArabic ? "ابقَ على تواصل" : "Stay connected"}</p>
        <h2 className="ohTodayTitle">
          {isArabic ? "نتابع صحتك حيث أنت" : "We follow up, wherever you are"}
        </h2>
        <p className="ohTodaySubtitle">
          {isArabic
            ? "اختر كيف تريد أن نصلك: واتساب أو البريد أو التنبيهات داخل الموقع."
            : "Choose how you want to hear from us: WhatsApp, email, or alerts in the app."}
        </p>
      </header>

      <ul className="ohConnectGrid">
        {CHANNELS.map((channel) => (
          <li key={channel.key} className="ohConnectCard" data-channel={channel.key}>
            <span className="ohConnectIcon">{channel.icon}</span>

            <h3>
              {isArabic ? channel.title.ar : channel.title.en}
              {!channel.live && (
                <span className="ohConnectBadge">
                  {isArabic ? "قريبًا" : "Coming soon"}
                </span>
              )}
            </h3>

            <p>{isArabic ? channel.description.ar : channel.description.en}</p>
          </li>
        ))}
      </ul>

      <div className="ohConnectActions">
        <Link href={href} className="primaryBtn">
          {isLoggedIn
            ? isArabic ? "إعداد التواصل" : "Set up communication"
            : isArabic ? "أنشئ حسابًا مجانيًا" : "Create a free account"}
        </Link>
      </div>
    </section>
  );
}
