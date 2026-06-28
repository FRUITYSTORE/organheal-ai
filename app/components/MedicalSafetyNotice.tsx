"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";
type NoticeContext = "signup" | "upload" | "intelligence";

type MedicalSafetyNoticeProps = {
  context: NoticeContext;
};

export default function MedicalSafetyNotice({
  context,
}: MedicalSafetyNoticeProps) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const title = isArabic
    ? "تنبيه مهم للسلامة الطبية والخصوصية"
    : "Important Medical Safety & Privacy Notice";

  const contextText = {
    signup: isArabic
      ? "بإنشاء حساب في OrganHeal AI، أنت تفهم أن المنصة تقدم معلومات صحية تعليمية وتنظيمية فقط، وليست بديلًا عن الطبيب أو الرعاية الطبية المرخصة."
      : "By creating an OrganHeal AI account, you understand that the platform provides educational and organizational health intelligence only and does not replace licensed medical care.",
    upload: isArabic
      ? "قبل رفع أي تقرير طبي، تأكد أنك تملك الحق في استخدامه. سيتم استخدام التقرير لمساعدتك على تنظيم وفهم المعلومات الصحية داخل حسابك."
      : "Before uploading any medical report, make sure you have the right to use it. Reports are processed to help organize and explain health information inside your account.",
    intelligence: isArabic
      ? "تحليل الذكاء الصحي قد يساعدك على فهم التقرير وتجهيز أسئلة للطبيب، لكنه لا يقدم تشخيصًا أو علاجًا أو قرارًا طبيًا نهائيًا."
      : "Health intelligence can help explain reports and prepare questions for your doctor, but it does not provide diagnosis, treatment, or final medical decisions.",
  };

  return (
    <div className="medicalSafetyNotice" dir={isArabic ? "rtl" : "ltr"}>
      <div className="medicalSafetyIcon">⚕️</div>

      <div>
        <h3>{title}</h3>

        <p>{contextText[context]}</p>

        <p>
          {isArabic
            ? "في الحالات الطارئة مثل ألم صدر شديد، ضيق نفس شديد، إغماء، نزيف شديد، أو تشوش مفاجئ، اطلب الرعاية الطبية فورًا."
            : "For emergencies such as severe chest pain, severe shortness of breath, fainting, severe bleeding, or sudden confusion, seek medical care immediately."}
        </p>

        <div className="medicalSafetyLinks">
          <Link href="/medical-disclaimer">
            {isArabic ? "إخلاء المسؤولية الطبية" : "Medical Disclaimer"}
          </Link>

          <Link href="/privacy">
            {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>

          <Link href="/terms">
            {isArabic ? "شروط الاستخدام" : "Terms of Use"}
          </Link>
        </div>
      </div>
    </div>
  );
}