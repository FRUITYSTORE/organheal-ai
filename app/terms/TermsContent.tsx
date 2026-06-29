"use client";

import { useEffect, useState } from "react";
import LegalPage from "../components/LegalPage";

type Language = "en" | "ar";

export default function TermsContent() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  if (isArabic) {
    return (
      <div dir="rtl">
        <LegalPage
          badge="شروط الاستخدام"
          title="شروط الاستخدام"
          intro="توضح شروط الاستخدام هذه القواعد الأساسية لاستخدام OrganHeal AI وميزات الذكاء الصحي داخل المنصة."
          updated="يونيو 2026"
          sections={[
            {
              title: "1. الغرض التعليمي",
              body: "تم تصميم OrganHeal AI للذكاء الصحي التعليمي، التنظيم الشخصي، شرح التقارير، والتحضير للنقاشات الصحية. المنصة ليست جهازًا طبيًا ولا تستبدل الرعاية الطبية المرخصة.",
            },
            {
              title: "2. لا يوجد تشخيص أو علاج طبي",
              body: "لا تشخّص المنصة الأمراض، ولا تصف العلاج، ولا توصي بقرارات الرعاية الطارئة، ولا تستبدل الأطباء أو الممرضين أو الصيادلة أو أي مختصين صحيين مرخصين.",
            },
            {
              title: "3. حساب المستخدم",
              body: "يتحمل المستخدمون مسؤولية الحفاظ على سرية بيانات الدخول الخاصة بهم، ويتحملون مسؤولية جميع الأنشطة التي تتم من خلال حساباتهم.",
            },
            {
              title: "4. المعلومات المرفوعة",
              body: "يجب على المستخدمين رفع التقارير أو نتائج المختبر أو المعلومات الصحية التي يملكون الحق في استخدامها فقط. يتحمل المستخدم مسؤولية دقة واكتمال المعلومات التي يقدمها.",
            },
            {
              title: "5. حدود الذكاء الاصطناعي والنظام",
              body: "قد تكون الملخصات الناتجة عن الذكاء الاصطناعي غير مكتملة أو غير دقيقة أو قابلة لسوء الفهم. يجب على المستخدمين التحقق من المعلومات الصحية المهمة مع مختصين صحيين مرخصين قبل اتخاذ قرارات صحية.",
            },
            {
              title: "6. الاستخدام المقبول",
              body: "لا يجوز للمستخدمين إساءة استخدام المنصة، أو محاولة الوصول غير المصرح به، أو رفع محتوى ضار، أو تعطيل ضوابط الأمان، أو استخدام OrganHeal AI لأغراض غير قانونية.",
            },
            {
              title: "7. تغييرات المنصة",
              body: "قد يقوم OrganHeal AI بتحديث أو تعديل أو تعليق أو إزالة بعض الميزات مع تطور المنصة.",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div dir="ltr">
      <LegalPage
        badge="TERMS OF USE"
        title="Terms of Use"
        intro="These Terms of Use explain the basic rules for using OrganHeal AI and its health intelligence features."
        updated="June 2026"
        sections={[
          {
            title: "1. Educational Purpose",
            body: "OrganHeal AI is designed for educational health intelligence, personal organization, report explanation, and preparation for healthcare discussions. It is not a medical device and does not replace licensed medical care.",
          },
          {
            title: "2. No Medical Diagnosis or Treatment",
            body: "The platform does not diagnose disease, prescribe treatment, recommend emergency care decisions, or replace doctors, nurses, pharmacists, or other licensed healthcare professionals.",
          },
          {
            title: "3. User Account",
            body: "Users are responsible for maintaining the confidentiality of their account credentials and for all activity that occurs under their account.",
          },
          {
            title: "4. Uploaded Information",
            body: "Users should only upload reports, lab results, or health information that they have the right to use. Users are responsible for the accuracy and completeness of the information they provide.",
          },
          {
            title: "5. AI and System Limitations",
            body: "AI-generated summaries may be incomplete, inaccurate, or misinterpreted. Users should verify important health information with licensed healthcare professionals before making health-related decisions.",
          },
          {
            title: "6. Acceptable Use",
            body: "Users may not misuse the platform, attempt unauthorized access, upload harmful content, interfere with security controls, or use OrganHeal AI for unlawful purposes.",
          },
          {
            title: "7. Platform Changes",
            body: "OrganHeal AI may update, modify, suspend, or remove features as the platform develops.",
          },
        ]}
      />
    </div>
  );
}
