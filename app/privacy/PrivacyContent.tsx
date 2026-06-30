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

export default function PrivacyContent() {
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

  const policySections = [
    {
      title: text("1. Information We May Collect", "1. المعلومات التي قد نجمعها"),
      items: [
        text(
          "Account information such as email address, selected username, profile details, and authentication-related information.",
          "معلومات الحساب مثل البريد الإلكتروني، اسم المستخدم المختار، تفاصيل الملف الشخصي، والمعلومات المرتبطة بتسجيل الدخول."
        ),
        text(
          "Health-related inputs provided by the user, including organ assessments, daily check-ins, health history, uploaded medical reports, lab values, and generated health intelligence summaries.",
          "المدخلات الصحية التي يقدمها المستخدم، بما في ذلك تقييمات الأعضاء، التحديثات اليومية، التاريخ الصحي، التقارير الطبية المرفوعة، قيم المختبر، وملخصات الذكاء الصحي المولدة."
        ),
        text(
          "Technical information such as browser type, device information, session data, and basic usage activity to keep the service secure and functional.",
          "معلومات تقنية مثل نوع المتصفح، معلومات الجهاز، بيانات الجلسة، ونشاط الاستخدام الأساسي للمساعدة في أمان وتشغيل الخدمة."
        ),
      ],
    },
    {
      title: text("2. How Information Is Used", "2. كيفية استخدام المعلومات"),
      items: [
        text(
          "Information is used to provide health assessments, organize uploaded reports, generate educational health intelligence, create patient-friendly summaries, support doctor-ready briefs, and improve the user experience.",
          "تُستخدم المعلومات لتقديم التقييمات الصحية، تنظيم التقارير المرفوعة، توليد ذكاء صحي تعليمي، إنشاء ملخصات مفهومة للمستخدم، دعم ملخصات جاهزة للطبيب، وتحسين تجربة المستخدم."
        ),
        text(
          "OrganHeal AI does not use the platform to provide medical diagnosis, treatment, prescriptions, or emergency medical advice.",
          "لا يستخدم OrganHeal AI المنصة لتقديم تشخيص طبي، علاج، وصفات دوائية، أو نصائح طبية طارئة."
        ),
      ],
    },
    {
      title: text("3. Health Data", "3. البيانات الصحية"),
      items: [
        text(
          "Health-related information is sensitive. Users should only upload information they are comfortable storing and processing inside their OrganHeal AI account.",
          "المعلومات الصحية حساسة. يجب على المستخدم رفع المعلومات التي يشعر بالراحة في تخزينها ومعالجتها داخل حسابه في OrganHeal AI فقط."
        ),
        text(
          "Uploaded reports and generated insights are intended for education, organization, and preparation for discussions with licensed healthcare professionals.",
          "التقارير المرفوعة والملخصات المولدة مخصصة للتعليم، التنظيم، والتحضير للنقاش مع مختصين صحيين مرخصين."
        ),
      ],
    },
    {
      title: text("4. Data Protection", "4. حماية البيانات"),
      items: [
        text(
          "OrganHeal AI uses technical safeguards such as authentication, database access controls, and secure production configuration to help protect user information.",
          "يستخدم OrganHeal AI وسائل حماية تقنية مثل تسجيل الدخول، ضوابط الوصول إلى قاعدة البيانات، وإعدادات إنتاج آمنة للمساعدة في حماية معلومات المستخدم."
        ),
        text(
          "No online platform can guarantee absolute security.",
          "لا توجد منصة إلكترونية يمكنها ضمان الأمان المطلق."
        ),
      ],
    },
    {
      title: text("5. Third-Party Services", "5. خدمات الطرف الثالث"),
      items: [
        text(
          "OrganHeal AI may rely on trusted infrastructure and platform providers for hosting, authentication, storage, database services, and document processing.",
          "قد يعتمد OrganHeal AI على مزودي بنية تحتية ومنصات موثوقين للاستضافة، تسجيل الدخول، التخزين، قواعد البيانات، ومعالجة المستندات."
        ),
        text(
          "These services help operate the platform securely and reliably.",
          "تساعد هذه الخدمات في تشغيل المنصة بشكل آمن وموثوق."
        ),
      ],
    },
    {
      title: text("6. User Responsibilities", "6. مسؤوليات المستخدم"),
      items: [
        text(
          "Users are responsible for keeping login credentials secure, reviewing information carefully, and avoiding emergency use of the platform.",
          "يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات الدخول، مراجعة المعلومات بعناية، وتجنب استخدام المنصة في الحالات الطارئة."
        ),
        text(
          "Users should consult licensed healthcare professionals for medical decisions.",
          "يجب على المستخدمين استشارة مختصين صحيين مرخصين لاتخاذ القرارات الطبية."
        ),
      ],
    },
    {
      title: text("7. Changes to This Policy", "7. التغييرات على هذه السياسة"),
      items: [
        text(
          "OrganHeal AI may update this Privacy Policy as the platform grows.",
          "قد يقوم OrganHeal AI بتحديث سياسة الخصوصية مع نمو المنصة."
        ),
        text(
          "Continued use of the platform after updates means the user accepts the updated policy.",
          "استمرار استخدام المنصة بعد التحديثات يعني قبول المستخدم للسياسة المحدّثة."
        ),
      ],
    },
  ];

  const privacyHighlights = [
    {
      title: text("Account Data", "بيانات الحساب"),
      description: text(
        "Email, username, authentication status, and profile-related details.",
        "البريد الإلكتروني، اسم المستخدم، حالة تسجيل الدخول، وتفاصيل الملف الشخصي."
      ),
    },
    {
      title: text("Health Inputs", "المدخلات الصحية"),
      description: text(
        "Assessments, check-ins, health history, uploaded reports, and generated summaries.",
        "التقييمات، التحديثات الصحية، التاريخ الصحي، التقارير المرفوعة، والملخصات المولدة."
      ),
    },
    {
      title: text("Platform Use", "استخدام المنصة"),
      description: text(
        "Basic technical and usage data to keep OrganHeal functional and secure.",
        "بيانات تقنية واستخدام أساسية للحفاظ على عمل OrganHeal وأمانه."
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
                {text("Privacy Policy", "سياسة الخصوصية")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "How OrganHeal handles account and health information.",
                  "كيف يتعامل OrganHeal مع بيانات الحساب والمعلومات الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "This Privacy Policy explains how OrganHeal AI may collect, use, protect, and organize information when users interact with the platform.",
                  "توضح سياسة الخصوصية هذه كيف يمكن لـ OrganHeal AI جمع المعلومات واستخدامها وحمايتها وتنظيمها عند تفاعل المستخدمين مع المنصة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/terms" className="primaryBtn">
                  {text("Terms of Use", "شروط الاستخدام")}
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
                  {text("Policy", "سياسة")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "This page is written to help users understand privacy expectations clearly. It should be reviewed as OrganHeal grows and adds more features.",
                  "هذه الصفحة مكتوبة لمساعدة المستخدمين على فهم توقعات الخصوصية بوضوح. يجب مراجعتها مع نمو OrganHeal وإضافة ميزات جديدة."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohGrid cols3">
          {privacyHighlights.map((item) => (
            <article className="ohMetricCard" key={item.title}>
              <span className="ohMetricLabel">{item.title}</span>
              <span className="ohMetricHint">{item.description}</span>
            </article>
          ))}
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🔒</span>
          <div>
            <strong>
              {text("Health information is sensitive", "المعلومات الصحية حساسة")}
            </strong>
            <br />
            {text(
              "Only upload information you are comfortable storing and processing inside your OrganHeal account.",
              "ارفع فقط المعلومات التي تشعر بالراحة في تخزينها ومعالجتها داخل حسابك في OrganHeal."
            )}
          </div>
        </section>

        <section className="ohStack">
          {policySections.map((section) => (
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
              {text("Your responsibility", "مسؤوليتك كمستخدم")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Review what you upload and protect your account.",
                "راجع ما ترفعه واحمِ حسابك."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Use strong passwords, keep login credentials private, and avoid uploading information you do not want stored inside the platform.",
                "استخدم كلمات مرور قوية، حافظ على سرية بيانات الدخول، وتجنب رفع معلومات لا تريد تخزينها داخل المنصة."
              )}
            </p>

            <Link href="/reset-password" className="secondaryBtn">
              {text("Reset Password", "إعادة تعيين كلمة المرور")}
            </Link>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Medical limits", "الحدود الطبية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Privacy does not change medical safety limits.",
                "الخصوصية لا تغيّر حدود السلامة الطبية."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal helps organize and explain information, but medical decisions should be reviewed with licensed healthcare professionals.",
                "يساعد OrganHeal على تنظيم وشرح المعلومات، لكن القرارات الطبية يجب مراجعتها مع مختصين صحيين مرخصين."
              )}
            </p>

            <Link href="/medical-disclaimer" className="primaryBtn">
              {text("Read Medical Disclaimer", "قراءة إخلاء المسؤولية الطبية")}
            </Link>
          </article>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Questions about privacy?", "هل لديك سؤال حول الخصوصية؟")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Contact OrganHeal for privacy or platform questions.",
                  "تواصل مع OrganHeal لأسئلة الخصوصية أو المنصة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "For questions about your account, uploaded reports, or platform use, contact the OrganHeal team.",
                  "لأسئلة الحساب، التقارير المرفوعة، أو استخدام المنصة، تواصل مع فريق OrganHeal."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/contact" className="primaryBtn">
                {text("Contact", "تواصل معنا")}
              </Link>

              <Link href="/terms" className="secondaryBtn">
                {text("Terms", "الشروط")}
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
