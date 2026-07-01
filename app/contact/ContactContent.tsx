"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function ContactContent() {
  const email = "contact@organheal.com";

  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

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

  const contactReasons = [
    {
      icon: "💬",
      title: text("Platform Support", "دعم المنصة"),
      description: text(
        "Questions about using OrganHeal, account access, reports, or health analysis pages.",
        "أسئلة حول استخدام OrganHeal، الدخول للحساب، التقارير، أو صفحات التحليل الصحي."
      ),
    },
    {
      icon: "🧭",
      title: text("Feedback", "ملاحظات وتطوير"),
      description: text(
        "Share suggestions, issues, or ideas that can improve the OrganHeal experience.",
        "شاركنا اقتراحاتك، المشاكل، أو الأفكار التي يمكن أن تطور تجربة OrganHeal."
      ),
    },
    {
      icon: "🤝",
      title: text("Partnerships", "الشراكات"),
      description: text(
        "For business, clinic, wellness, education, or healthcare collaboration inquiries.",
        "لاستفسارات التعاون التجاري، العيادات، التثقيف الصحي، أو الشراكات الصحية."
      ),
    },
    {
      icon: "🛡️",
      title: text("Medical Safety", "السلامة الطبية"),
      description: text(
        "For safety-related feedback about educational content or medical disclaimers.",
        "للملاحظات المتعلقة بسلامة المحتوى التعليمي أو إخلاء المسؤولية الطبية."
      ),
    },
  ];

  const usefulLinks = [
    {
      href: "/about",
      label: text("About OrganHeal", "حول OrganHeal"),
      note: text("Mission and platform vision", "المهمة ورؤية المنصة"),
    },
    {
      href: "/pricing",
      label: text("Plans & Pricing", "الخطط والأسعار"),
      note: text("Free and Plus value structure", "هيكل قيمة Free و Plus"),
    },
    {
      href: "/medical-disclaimer",
      label: text("Medical Disclaimer", "إخلاء المسؤولية الطبية"),
      note: text("Important medical safety limits", "حدود السلامة الطبية المهمة"),
    },
    {
      href: "/privacy",
      label: text("Privacy Policy", "سياسة الخصوصية"),
      note: text("How privacy is described", "كيف يتم توضيح الخصوصية"),
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Contact & Support Center", "مركز التواصل والدعم")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Contact OrganHeal AI",
                  "تواصل مع OrganHeal AI"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "For general platform questions, support requests, feedback, partnerships, or business inquiries, you can contact the OrganHeal AI team.",
                  "للاستفسارات العامة حول المنصة، طلبات الدعم، الملاحظات، الشراكات، أو الاستفسارات التجارية، يمكنك التواصل مع فريق OrganHeal AI."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href={`mailto:${email}`} className="primaryBtn">
                  {text("Email OrganHeal", "راسل OrganHeal")}
                </a>

                <Link href="/about" className="secondaryBtn">
                  {text("About", "حول المنصة")}
                </Link>

                <Link href="/pricing" className="secondaryBtn">
                  {text("Plans", "الخطط")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("General Contact", "التواصل العام")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {email}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Support", "دعم")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Use this email for platform questions, feedback, support, partnership, or business inquiries.",
                  "استخدم هذا البريد لأسئلة المنصة، الملاحظات، الدعم، الشراكات، أو الاستفسارات التجارية."
                )}
              </p>

              <div className="ohDivider" />

              <p className="ohMetricLabel">
                {text("Not for emergencies", "ليس للطوارئ")}
              </p>

              <p className="ohCardText">
                {text(
                  "Please do not send emergency medical requests through this contact page.",
                  "يرجى عدم إرسال طلبات طبية طارئة من خلال صفحة التواصل هذه."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("How we can help", "كيف يمكننا المساعدة؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Choose the right contact reason",
                  "اختر سبب التواصل المناسب"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal is still evolving. Feedback, support requests, and partnership ideas help improve the platform.",
                  "OrganHeal ما زال يتطور. الملاحظات، طلبات الدعم، وأفكار الشراكة تساعد على تحسين المنصة."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {contactReasons.map((item) => (
              <article className="ohMetricCard" key={item.title}>
                <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
                <span className="ohMetricLabel" style={{ marginTop: "10px" }}>
                  {item.title}
                </span>
                <span className="ohMetricHint">{item.description}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Send an email", "أرسل بريدًا إلكترونيًا")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Tell us what you need help with.",
                "أخبرنا كيف يمكننا مساعدتك."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "For faster review, include the page name, what you were trying to do, and any error message if available.",
                "لتسهيل المراجعة، اذكر اسم الصفحة، ماذا كنت تحاول أن تفعل، وأي رسالة خطأ إن وجدت."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Support email", "بريد الدعم")}
                  </p>
                  <p className="ohTimelineMeta">{email}</p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Suggested details", "تفاصيل مفيدة")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Account issue, report upload issue, pricing question, or partnership inquiry.",
                      "مشكلة حساب، مشكلة رفع تقرير، سؤال عن الخطط، أو استفسار شراكة."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="ohButtonRow" style={{ marginTop: "20px" }}>
              <a href={`mailto:${email}`} className="primaryBtn">
                {text("Open Email", "فتح البريد")}
              </a>

              <Link href="/dashboard" className="secondaryBtn">
                {text("Dashboard", "لوحة التحكم")}
              </Link>
            </div>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Medical safety", "السلامة الطبية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "This page is not for urgent medical help.",
                "هذه الصفحة ليست للمساعدة الطبية الطارئة."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal AI does not provide emergency medical care, diagnosis, treatment, prescriptions, or urgent medical advice.",
                "لا يقدم OrganHeal AI رعاية طبية طارئة أو تشخيصًا أو علاجًا أو وصفات طبية أو نصائح طبية عاجلة."
              )}
            </p>

            <div className="ohTrustNotice" style={{ marginTop: "18px" }}>
              <span aria-hidden="true">🚨</span>
              <div>
                <strong>
                  {text("For urgent symptoms", "في حال الأعراض الطارئة")}
                </strong>
                <br />
                {text(
                  "For severe chest pain, severe shortness of breath, fainting, confusion, severe bleeding, or urgent symptoms, contact emergency services or go to the nearest emergency department.",
                  "في حال ألم صدر شديد، ضيق نفس شديد، إغماء، تشوش، نزيف شديد، أو أعراض طارئة، تواصل مع الطوارئ أو توجه إلى أقرب قسم طوارئ."
                )}
              </div>
            </div>

            <Link
              href="/medical-disclaimer"
              className="secondaryBtn"
              style={{ marginTop: "20px", display: "inline-flex" }}
            >
              {text("Read Medical Disclaimer", "قراءة إخلاء المسؤولية الطبية")}
            </Link>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Useful Links", "روابط مفيدة")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Find the right place before contacting us",
                  "اعثر على الصفحة المناسبة قبل التواصل"
                )}
              </h2>
            </div>
          </div>

          <div className="ohGrid cols4">
            {usefulLinks.map((item) => (
              <Link href={item.href} className="ohMetricCard" key={item.href}>
                <span className="ohMetricLabel">{item.label}</span>
                <span className="ohMetricHint">{item.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start using OrganHeal", "ابدأ استخدام OrganHeal")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Start with an assessment or create your account.",
                  "ابدأ بتقييم صحي أو أنشئ حسابك."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "You can explore OrganHeal by starting a health assessment, uploading reports, or reviewing the platform plans.",
                  "يمكنك استكشاف OrganHeal من خلال بدء تقييم صحي، رفع تقارير، أو مراجعة خطط المنصة."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/assessment" className="primaryBtn">
                {text("Start Assessment", "ابدأ التقييم")}
              </Link>

              <Link href="/signup" className="secondaryBtn">
                {text("Create Account", "إنشاء حساب")}
              </Link>

              <Link href="/pricing" className="secondaryBtn">
                {text("View Plans", "عرض الخطط")}
              </Link>

              <Link href="/" className="secondaryBtn">
                {text("Back Home", "العودة للرئيسية")}
              </Link>
            </div>
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
              "OrganHeal AI provides educational and organizational health analysis only. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care.",
              "OrganHeal AI يقدم ذكاء صحي تعليمي وتنظيمي فقط. لا يشخص ولا يعالج ولا يصف علاجًا ولا يقدم نصائح طارئة ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


