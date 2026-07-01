"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function TermsContent() {
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

  const termsSections = [
    {
      title: text("1. Educational Purpose", "1. الغرض التعليمي"),
      items: [
        text(
          "OrganHeal AI is designed for educational health analysis, personal organization, report explanation, and preparation for healthcare discussions.",
          "تم تصميم OrganHeal AI للذكاء الصحي التعليمي، التنظيم الشخصي، شرح التقارير، والتحضير للنقاشات الصحية."
        ),
        text(
          "The platform is not a medical device and does not replace licensed medical care.",
          "المنصة ليست جهازًا طبيًا ولا تستبدل الرعاية الطبية المرخصة."
        ),
      ],
    },
    {
      title: text("2. No Medical Diagnosis or Treatment", "2. لا يوجد تشخيص أو علاج طبي"),
      items: [
        text(
          "OrganHeal AI does not diagnose disease, prescribe treatment, recommend emergency care decisions, or replace doctors, nurses, pharmacists, or other licensed healthcare professionals.",
          "لا يشخّص OrganHeal AI الأمراض، ولا يصف العلاج، ولا يوصي بقرارات الرعاية الطارئة، ولا يستبدل الأطباء أو الممرضين أو الصيادلة أو أي مختصين صحيين مرخصين."
        ),
        text(
          "Users should review important health information with licensed healthcare professionals before making medical decisions.",
          "يجب على المستخدمين مراجعة المعلومات الصحية المهمة مع مختصين صحيين مرخصين قبل اتخاذ قرارات طبية."
        ),
      ],
    },
    {
      title: text("3. User Account", "3. حساب المستخدم"),
      items: [
        text(
          "Users are responsible for maintaining the confidentiality of their account credentials.",
          "يتحمل المستخدمون مسؤولية الحفاظ على سرية بيانات الدخول الخاصة بهم."
        ),
        text(
          "Users are responsible for all activity that occurs under their account.",
          "يتحمل المستخدمون مسؤولية جميع الأنشطة التي تتم من خلال حساباتهم."
        ),
        text(
          "Users should use a secure password and keep their email access protected.",
          "يجب على المستخدمين استخدام كلمة مرور آمنة والحفاظ على أمان الوصول إلى بريدهم الإلكتروني."
        ),
      ],
    },
    {
      title: text("4. Uploaded Information", "4. المعلومات المرفوعة"),
      items: [
        text(
          "Users should only upload reports, lab results, or health information that they have the right to use.",
          "يجب على المستخدمين رفع التقارير أو نتائج المختبر أو المعلومات الصحية التي يملكون الحق في استخدامها فقط."
        ),
        text(
          "Users are responsible for the accuracy, completeness, and appropriateness of the information they provide.",
          "يتحمل المستخدم مسؤولية دقة واكتمال وملاءمة المعلومات التي يقدمها."
        ),
        text(
          "Users should not upload information they do not want stored or processed inside the platform.",
          "يجب على المستخدمين عدم رفع معلومات لا يرغبون في تخزينها أو معالجتها داخل المنصة."
        ),
      ],
    },
    {
      title: text("5. AI and System Limitations", "5. حدود الذكاء الاصطناعي والنظام"),
      items: [
        text(
          "AI-generated summaries may be incomplete, inaccurate, outdated, or misinterpreted.",
          "قد تكون الملخصات الناتجة عن الذكاء الاصطناعي غير مكتملة أو غير دقيقة أو قديمة أو قابلة لسوء الفهم."
        ),
        text(
          "OrganHeal AI may not identify every important medical detail in an uploaded report or user input.",
          "قد لا يحدد OrganHeal AI كل التفاصيل الطبية المهمة في التقرير المرفوع أو المدخلات التي يقدمها المستخدم."
        ),
        text(
          "Users should verify important health information with licensed healthcare professionals.",
          "يجب على المستخدمين التحقق من المعلومات الصحية المهمة مع مختصين صحيين مرخصين."
        ),
      ],
    },
    {
      title: text("6. Acceptable Use", "6. الاستخدام المقبول"),
      items: [
        text(
          "Users may not misuse the platform, attempt unauthorized access, upload harmful content, interfere with security controls, or use OrganHeal AI for unlawful purposes.",
          "لا يجوز للمستخدمين إساءة استخدام المنصة، أو محاولة الوصول غير المصرح به، أو رفع محتوى ضار، أو تعطيل ضوابط الأمان، أو استخدام OrganHeal AI لأغراض غير قانونية."
        ),
        text(
          "Users may not use the platform to harm others, impersonate another person, or upload health information without proper permission.",
          "لا يجوز استخدام المنصة لإيذاء الآخرين، أو انتحال شخصية شخص آخر، أو رفع معلومات صحية دون إذن مناسب."
        ),
      ],
    },
    {
      title: text("7. Platform Changes", "7. تغييرات المنصة"),
      items: [
        text(
          "OrganHeal AI may update, modify, suspend, or remove features as the platform develops.",
          "قد يقوم OrganHeal AI بتحديث أو تعديل أو تعليق أو إزالة بعض الميزات مع تطور المنصة."
        ),
        text(
          "Some features may be experimental, limited, unavailable, or changed before full release.",
          "قد تكون بعض الميزات تجريبية أو محدودة أو غير متاحة أو قابلة للتغيير قبل الإطلاق الكامل."
        ),
      ],
    },
    {
      title: text("8. Subscriptions and Future Payments", "8. الاشتراكات والدفع المستقبلي"),
      items: [
        text(
          "Payments and subscriptions may be introduced later. Until payment features are activated, pricing pages may describe intended value rather than active billing.",
          "قد يتم تفعيل الدفع والاشتراكات لاحقًا. إلى حين تفعيل الدفع، قد توضّح صفحات الأسعار القيمة المقترحة وليس فوترة فعالة."
        ),
        text(
          "Subscription limits, payment terms, refunds, and feature gating may be added or updated when paid plans are launched.",
          "قد تتم إضافة أو تحديث حدود الاشتراك، شروط الدفع، الاسترداد، وقفل الميزات عند إطلاق الخطط المدفوعة."
        ),
      ],
    },
    {
      title: text("9. Emergency Use", "9. الاستخدام في الطوارئ"),
      items: [
        text(
          "OrganHeal AI is not for emergency medical situations.",
          "OrganHeal AI ليس مخصصًا للحالات الطبية الطارئة."
        ),
        text(
          "For severe chest pain, severe shortness of breath, fainting, confusion, severe bleeding, or urgent symptoms, contact emergency services or visit the nearest emergency department.",
          "في حال ألم صدر شديد، ضيق نفس شديد، إغماء، تشوش، نزيف شديد، أو أعراض طارئة، تواصل مع الطوارئ أو توجه إلى أقرب قسم طوارئ."
        ),
      ],
    },
  ];

  const quickRules = [
    {
      title: text("Educational use only", "استخدام تعليمي فقط"),
      note: text(
        "OrganHeal helps organize and explain information.",
        "OrganHeal يساعد على تنظيم وشرح المعلومات."
      ),
    },
    {
      title: text("No medical replacement", "لا يستبدل الطبيب"),
      note: text(
        "Clinical decisions require licensed professionals.",
        "القرارات الطبية تحتاج مختصين مرخصين."
      ),
    },
    {
      title: text("User responsibility", "مسؤولية المستخدم"),
      note: text(
        "Users are responsible for account security and uploaded information.",
        "المستخدم مسؤول عن أمان الحساب والمعلومات المرفوعة."
      ),
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Terms of Use", "شروط الاستخدام")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "The basic rules for using OrganHeal AI.",
                  "القواعد الأساسية لاستخدام OrganHeal AI."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "These Terms of Use explain the rules for using OrganHeal AI and its health analysis features, including educational use, user responsibilities, and medical limitations.",
                  "توضح شروط الاستخدام هذه القواعد الأساسية لاستخدام OrganHeal AI وميزات التحليل الصحي، بما يشمل الاستخدام التعليمي، مسؤوليات المستخدم، والحدود الطبية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/privacy" className="primaryBtn">
                  {text("Privacy Policy", "سياسة الخصوصية")}
                </Link>

                <Link href="/medical-disclaimer" className="secondaryBtn">
                  {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
                </Link>

                <Link href="/contact" className="secondaryBtn">
                  {text("Contact", "تواصل معنا")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Last Updated", "آخر تحديث")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("June 2026", "يونيو 2026")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Terms", "شروط")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "By using OrganHeal AI, users agree to use the platform responsibly and understand its educational and medical limitations.",
                  "باستخدام OrganHeal AI، يوافق المستخدم على استخدام المنصة بمسؤولية وفهم حدودها التعليمية والطبية."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohGrid cols3">
          {quickRules.map((rule) => (
            <article className="ohMetricCard" key={rule.title}>
              <span className="ohMetricLabel">{rule.title}</span>
              <span className="ohMetricHint">{rule.note}</span>
            </article>
          ))}
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Important medical limit", "حد طبي مهم")}
            </strong>
            <br />
            {text(
              "OrganHeal AI is educational and organizational only. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care.",
              "OrganHeal AI تعليمي وتنظيمي فقط. لا يشخص ولا يعالج ولا يصف علاجًا ولا يقدم نصائح طارئة ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="ohStack">
          {termsSections.map((section) => (
            <article className="ohCard" key={section.title}>
              <h2 className="ohCardTitle">{section.title}</h2>

              <div className="ohTimeline" style={{ marginTop: "18px" }}>
                {section.items.map((item) => (
                  <div className="ohTimelineItem" key={item}>
                    <span className="ohTimelineDot" />
                    <p className="ohTimelineMeta">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Related privacy rules", "قواعد الخصوصية المرتبطة")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Understand how account and health information may be handled.",
                "افهم كيف يمكن التعامل مع بيانات الحساب والمعلومات الصحية."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The Privacy Policy explains how OrganHeal may collect, use, protect, and organize information inside the platform.",
                "توضح سياسة الخصوصية كيف يمكن لـ OrganHeal جمع المعلومات واستخدامها وحمايتها وتنظيمها داخل المنصة."
              )}
            </p>

            <Link href="/privacy" className="primaryBtn">
              {text("Read Privacy Policy", "قراءة سياسة الخصوصية")}
            </Link>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Medical safety", "السلامة الطبية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Review the medical disclaimer before relying on any output.",
                "راجع إخلاء المسؤولية الطبية قبل الاعتماد على أي مخرجات."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The Medical Disclaimer explains the limits of educational health analysis and the need for licensed professional review.",
                "يوضح إخلاء المسؤولية الطبية حدود التحليل الصحي التعليمي والحاجة إلى مراجعة مختص مرخص."
              )}
            </p>

            <Link href="/medical-disclaimer" className="secondaryBtn">
              {text("Read Medical Disclaimer", "قراءة إخلاء المسؤولية الطبية")}
            </Link>
          </article>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Questions about these terms?", "هل لديك سؤال حول هذه الشروط؟")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Contact OrganHeal for terms or platform questions.",
                  "تواصل مع OrganHeal لأسئلة الشروط أو المنصة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "For questions about the platform, account access, privacy, or terms, contact the OrganHeal team.",
                  "لأسئلة المنصة، الوصول للحساب، الخصوصية، أو الشروط، تواصل مع فريق OrganHeal."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/contact" className="primaryBtn">
                {text("Contact", "تواصل معنا")}
              </Link>

              <Link href="/signup" className="secondaryBtn">
                {text("Create Account", "إنشاء حساب")}
              </Link>

              <Link href="/" className="secondaryBtn">
                {text("Back Home", "العودة للرئيسية")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


