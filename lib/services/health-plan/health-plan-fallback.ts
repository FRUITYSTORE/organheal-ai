type Translate = (english: string, arabic: string) => string;

type BuildFallbackNextActionInput = {
  hasAssessment: boolean;
  hasReports: boolean;
  hasGenerated: boolean;
  hasCheckIn: boolean;
  latestAnalysisHref: string;
  text: Translate;
};

export type HealthPlanFallbackAction = {
  title: string;
  detail: string;
  href: string;
  button: string;
};

export function buildFallbackNextAction({
  hasAssessment,
  hasReports,
  hasGenerated,
  hasCheckIn,
  latestAnalysisHref,
  text,
}: BuildFallbackNextActionInput): HealthPlanFallbackAction {
  if (!hasAssessment) {
    return {
      title: text("Start your health assessment", "ابدأ التقييم الصحي"),
      detail: text(
        "Complete one assessment so OrganHeal can identify the priority area.",
        "أكمل تقييمًا واحدًا حتى يحدد OrganHeal الأولوية الصحية."
      ),
      href: "/assessment",
      button: text("Start Assessment", "ابدأ التقييم"),
    };
  }

  if (!hasReports) {
    return {
      title: text(
        "Upload your first medical report",
        "ارفع أول تقرير طبي"
      ),
      detail: text(
        "A report makes the plan more specific and easier to review.",
        "وجود تقرير يجعل الخطة أدق وأسهل للمراجعة."
      ),
      href: "/lab-upload",
      button: text("Upload Report", "رفع تقرير"),
    };
  }

  if (!hasGenerated) {
    return {
      title: text("Analyze the latest report", "حلّل آخر تقرير"),
      detail: text(
        "Generate a patient-friendly summary and doctor-ready brief.",
        "ولّد ملخصًا مبسطًا للمريض وملخصًا جاهزًا للطبيب."
      ),
      href: latestAnalysisHref,
      button: text("Analyze Report", "تحليل التقرير"),
    };
  }

  if (!hasCheckIn) {
    return {
      title: text("Complete today check-in", "أكمل Check-In اليوم"),
      detail: text(
        "Add sleep, stress, energy, activity, and mood so the plan becomes more personal.",
        "أضف النوم، الضغط، الطاقة، النشاط، والمزاج حتى تصبح الخطة أكثر شخصية."
      ),
      href: "/checkin",
      button: text("Open Check-In", "فتح Check-In"),
    };
  }

  return {
    title: text("Continue this week plan", "تابع خطة هذا الأسبوع"),
    detail: text(
      "Your plan is active. Continue the practical tasks below.",
      "الخطة فعالة الآن. تابع المهام العملية بالأسفل."
    ),
    href: "#tasks",
    button: text("Continue Tasks", "متابعة المهام"),
  };
}