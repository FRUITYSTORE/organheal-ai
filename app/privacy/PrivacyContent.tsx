"use client";

import { useEffect, useState } from "react";
import LegalPage from "../components/LegalPage";

type Language = "en" | "ar";

export default function PrivacyContent() {
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
          badge="سياسة الخصوصية"
          title="سياسة الخصوصية"
          intro="توضح سياسة الخصوصية هذه كيف يمكن لـ OrganHeal AI جمع المعلومات واستخدامها وحمايتها وتنظيمها عند تفاعل المستخدمين مع المنصة."
          updated="يونيو 2026"
          sections={[
            {
              title: "1. المعلومات التي قد نجمعها",
              body: [
                "قد يجمع OrganHeal AI معلومات الحساب مثل عنوان البريد الإلكتروني، تفاصيل الملف الشخصي، اسم المستخدم المختار، والمعلومات المرتبطة بتسجيل الدخول.",
                "قد تعالج المنصة أيضًا المدخلات الصحية التي يقدمها المستخدم، بما في ذلك تقييمات الأعضاء، Check-Ins اليومية، التاريخ الصحي، التقارير الطبية المرفوعة، قيم المختبر، وملخصات الذكاء الصحي المولدة.",
                "قد تتم معالجة معلومات تقنية مثل نوع المتصفح، معلومات الجهاز، بيانات الجلسة، ونشاط الاستخدام الأساسي للحفاظ على أمان الخدمة وتشغيلها.",
              ],
            },
            {
              title: "2. كيفية استخدام المعلومات",
              body: [
                "تُستخدم المعلومات لتقديم التقييمات الصحية، تنظيم التقارير المرفوعة، توليد ذكاء صحي تعليمي، إنشاء ملخصات مفهومة للمستخدم، دعم ملخصات جاهزة للطبيب، وتحسين تجربة المستخدم.",
                "لا يستخدم OrganHeal AI المنصة لتقديم تشخيص طبي، علاج، وصفات دوائية، أو نصائح طبية طارئة.",
              ],
            },
            {
              title: "3. البيانات الصحية",
              body: "المعلومات الصحية حساسة. يجب على المستخدمين رفع المعلومات التي يشعرون بالراحة في تخزينها ومعالجتها داخل حساب OrganHeal AI فقط. التقارير المرفوعة والملخصات المولدة مخصصة للتعليم، التنظيم، والتحضير للنقاش مع مختصين صحيين مرخصين.",
            },
            {
              title: "4. حماية البيانات",
              body: "يستخدم OrganHeal AI وسائل حماية تقنية مثل تسجيل الدخول، ضوابط الوصول إلى قاعدة البيانات، وإعدادات إنتاج آمنة للمساعدة في حماية معلومات المستخدم. لا توجد منصة إلكترونية يمكنها ضمان الأمان المطلق.",
            },
            {
              title: "5. خدمات الطرف الثالث",
              body: "قد يعتمد OrganHeal AI على مزودي بنية تحتية ومنصات موثوقين للاستضافة، تسجيل الدخول، التخزين، قواعد البيانات، ومعالجة المستندات. تساعد هذه الخدمات في تشغيل المنصة بشكل آمن وموثوق.",
            },
            {
              title: "6. مسؤوليات المستخدم",
              body: "يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات الدخول، مراجعة المعلومات بعناية، تجنب استخدام المنصة في الحالات الطارئة، واستشارة مختصين صحيين مرخصين لاتخاذ القرارات الطبية.",
            },
            {
              title: "7. التغييرات على هذه السياسة",
              body: "قد يقوم OrganHeal AI بتحديث سياسة الخصوصية مع نمو المنصة. استمرار استخدام المنصة بعد التحديثات يعني قبول المستخدم للسياسة المحدّثة.",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div dir="ltr">
      <LegalPage
        badge="PRIVACY POLICY"
        title="Privacy Policy"
        intro="This Privacy Policy explains how OrganHeal AI may collect, use, protect, and organize information when users interact with the platform."
        updated="June 2026"
        sections={[
          {
            title: "1. Information We May Collect",
            body: [
              "OrganHeal AI may collect account information such as email address, profile details, selected username, and authentication-related information.",
              "The platform may also process health-related inputs provided by the user, including organ assessments, daily check-ins, health history, uploaded medical reports, lab values, and generated health intelligence summaries.",
              "Technical information such as browser type, device information, session data, and basic usage activity may be processed to keep the service secure and functional.",
            ],
          },
          {
            title: "2. How Information Is Used",
            body: [
              "Information is used to provide health assessments, organize uploaded reports, generate educational health intelligence, create patient-friendly summaries, support doctor-ready briefs, and improve the user experience.",
              "OrganHeal AI does not use the platform to provide medical diagnosis, treatment, prescriptions, or emergency medical advice.",
            ],
          },
          {
            title: "3. Health Data",
            body: "Health-related information is sensitive. Users should only upload information they are comfortable storing and processing inside their OrganHeal AI account. Uploaded reports and generated insights are intended for education, organization, and preparation for discussions with licensed healthcare professionals.",
          },
          {
            title: "4. Data Protection",
            body: "OrganHeal AI uses technical safeguards such as authentication, database access controls, and secure production configuration to help protect user information. No online platform can guarantee absolute security.",
          },
          {
            title: "5. Third-Party Services",
            body: "OrganHeal AI may rely on trusted infrastructure and platform providers for hosting, authentication, storage, database services, and document processing. These services help operate the platform securely and reliably.",
          },
          {
            title: "6. User Responsibilities",
            body: "Users are responsible for keeping login credentials secure, reviewing information carefully, avoiding emergency use of the platform, and consulting licensed healthcare professionals for medical decisions.",
          },
          {
            title: "7. Changes to This Policy",
            body: "OrganHeal AI may update this Privacy Policy as the platform grows. Continued use of the platform after updates means the user accepts the updated policy.",
          },
        ]}
      />
    </div>
  );
}
