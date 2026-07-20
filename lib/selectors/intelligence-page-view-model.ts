export type IntelligenceTextResolver = (
  english: string,
  arabic: string
) => string;

export type IntelligenceNextStep = {
  label: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
};

type GetIntelligenceNextStepInput = {
  totalReportInsights: number;
  hasOpenGeneratedResult: boolean;
  generatedReportsCount: number;
  text: IntelligenceTextResolver;
};

export function getIntelligenceNextStep({
  totalReportInsights,
  hasOpenGeneratedResult,
  generatedReportsCount,
  text,
}: GetIntelligenceNextStepInput): IntelligenceNextStep {
  if (totalReportInsights === 0) {
    return {
      label: text("START HERE", "ابدأ هنا"),
      title: text(
        "Upload a medical report first",
        "ارفع تقريرًا طبيًا أولًا"
      ),
      description: text(
        "Add a lab report, radiology report, discharge summary, prescription, or medical document before generating intelligence.",
        "أضف تقرير مختبر، تقرير أشعة، ملخص خروج، وصفة، أو مستند طبي قبل توليد الذكاء."
      ),
      href: "/lab-upload",
      buttonText: text("Upload Report", "رفع تقرير"),
    };
  }

  if (hasOpenGeneratedResult) {
    return {
      label: text("RESULT READY", "النتيجة جاهزة"),
      title: text(
        "Review your saved analysis",
        "راجع الذكاء المولّد"
      ),
      description: text(
        "Your patient-friendly report and doctor-ready brief are available below. The next best step is to continue to your Health Plan.",
        "ملخص المريض والملخص الجاهز للطبيب متاحان أدناه. الخطوة التالية هي المتابعة إلى خطة الصحة."
      ),
      href: "/health-plan",
      buttonText: text("Open Health Plan", "افتح خطة الصحة"),
    };
  }

  if (generatedReportsCount > 0) {
    return {
      label: text("SAVED RESULTS", "نتائج محفوظة"),
      title: text(
        "Open a saved intelligence result",
        "افتح نتيجة ذكاء محفوظة"
      ),
      description: text(
        "Some reports already have saved analysis. Open a saved result or generate intelligence for another report.",
        "بعض التقارير لديها ذكاء مولّد مسبقًا. افتح نتيجة محفوظة أو ولّد ذكاء لتقرير آخر."
      ),
      href: "/reports",
      buttonText: text("Reports Library", "مكتبة التقارير"),
    };
  }

  return {
    label: text("READY TO GENERATE", "جاهز للتوليد"),
    title: text(
      "Generate intelligence for your report",
      "ولّد الذكاء لهذا التقرير"
    ),
    description: text(
      "Choose a report below and press Generate to create a patient-friendly summary, doctor-ready brief, and follow-up direction.",
      "اختر تقريرًا بالأسفل واضغط توليد الذكاء لإنشاء ملخص للمريض وملخص جاهز للطبيب واتجاه متابعة."
    ),
    href: "#report-intelligence-list",
    buttonText: text("Go to Reports", "اذهب إلى التقارير"),
  };
}