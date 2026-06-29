"use client";

import { useEffect, useState } from "react";
import LegalPage from "../components/LegalPage";

type Language = "en" | "ar";

export default function MedicalDisclaimerContent() {
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
          badge="تنبيه طبي"
          title="تنبيه طبي"
          intro="OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يُعد بديلًا عن الاستشارة الطبية المهنية أو الرعاية المقدمة من طبيب مرخص."
          updated="يونيو 2026"
          sections={[
            {
              title: "1. ليس تشخيصًا طبيًا",
              body: "OrganHeal AI لا يشخّص الحالات الطبية، ولا يؤكد الأمراض، ولا يصف الأدوية، ولا يوصي بخطط علاجية، ولا يستبدل الحكم السريري للطبيب.",
            },
            {
              title: "2. التحذير في حالات الطوارئ",
              body: "لا تستخدم OrganHeal AI في الحالات الطارئة. إذا كنت تعاني من ألم شديد في الصدر، ضيق نفس شديد، إغماء، ارتباك، أعراض جلطة، نزيف شديد، أو أي أعراض عاجلة، اطلب الرعاية الطبية الطارئة فورًا.",
            },
            {
              title: "3. تفسير التحاليل والتقارير",
              body: "قيم المختبر والتقارير الطبية قد تكون معقدة وتعتمد على العمر، التاريخ الصحي، الأدوية، الأعراض، الحمل، الفحص السريري، وعوامل أخرى. ملخصات OrganHeal AI تعليمية ويجب مراجعتها مع مختص صحي مرخص.",
            },
            {
              title: "4. حدود الذكاء الاصطناعي",
              body: "المحتوى الناتج عن الذكاء الاصطناعي قد يحتوي على أخطاء، أو قد يفوّت سياقًا مهمًا، أو يسيء فهم بعض المعلومات المرفوعة. يجب ألا يعتمد المستخدم على OrganHeal AI كمصدر وحيد لاتخاذ القرارات الصحية.",
            },
            {
              title: "5. الرعاية المهنية",
              body: "استشر دائمًا طبيبًا مرخصًا أو مختصًا صحيًا مؤهلًا للتشخيص، العلاج، قرارات الأدوية، أو أي مخاوف طبية عاجلة.",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div dir="ltr">
      <LegalPage
        badge="MEDICAL DISCLAIMER"
        title="Medical Disclaimer"
        intro="OrganHeal AI provides educational and organizational health intelligence only. It is not a substitute for professional medical advice."
        updated="June 2026"
        sections={[
          {
            title: "1. Not a Medical Diagnosis",
            body: "OrganHeal AI does not diagnose medical conditions, confirm diseases, prescribe medications, recommend treatment plans, or replace clinical judgment.",
          },
          {
            title: "2. Emergency Warning",
            body: "Do not use OrganHeal AI for emergencies. If you have severe chest pain, severe shortness of breath, fainting, confusion, stroke symptoms, severe bleeding, or any urgent symptoms, seek emergency medical care immediately.",
          },
          {
            title: "3. Lab and Report Interpretation",
            body: "Lab values and medical reports can be complex and depend on age, history, medications, symptoms, pregnancy status, clinical examination, and other factors. OrganHeal AI summaries are educational and should be reviewed with a licensed healthcare professional.",
          },
          {
            title: "4. AI Limitations",
            body: "AI-generated content may contain errors, miss context, or misunderstand uploaded information. Users should not rely on OrganHeal AI as the only source for health decisions.",
          },
          {
            title: "5. Professional Care",
            body: "Always consult a licensed doctor or qualified healthcare professional for diagnosis, treatment, medication decisions, or urgent medical concerns.",
          },
        ]}
      />
    </div>
  );
}
