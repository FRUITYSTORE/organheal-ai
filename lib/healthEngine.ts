export type HealthEngineInput = {
  overallScore: number;
  labScore?: number | null;
  dailyCheckInScore?: number | null;
  priorityOrgan?: string | null;
  strongestOrgan?: string | null;
  isArabic?: boolean;
};

export type HealthEngineResult = {
  healthProfile: string;
  riskPattern: string;
  opportunityTitle: string;
  bestNextAction: string;
  potentialGain: number;
  potentialScore: number;
  potentialLevel: string;
  healthAgeStatus: string;
  healthAgeMessage: string;
  trendDirection: string;
  trendMessage: string;
  doctorBrief: string;
};

export function generateHealthEngineResult(
  input: HealthEngineInput
): HealthEngineResult {
  const {
    overallScore,
    labScore,
    dailyCheckInScore,
    priorityOrgan,
    strongestOrgan,
    isArabic = false,
  } = input;

  const healthProfile =
    overallScore >= 85
      ? isArabic
        ? "ملف الصحة الوقائية"
        : "Preventive Health Profile"
      : overallScore >= 70
      ? isArabic
        ? "ملف الصحة المتوازن"
        : "Balanced Health Profile"
      : priorityOrgan === "Heart" || priorityOrgan === "Metabolic"
      ? isArabic
        ? "ملف المخاطر القلبية والأيضية"
        : "Cardiometabolic Risk Profile"
      : priorityOrgan === "Brain"
      ? isArabic
        ? "ملف التعافي الذهني"
        : "Brain & Recovery Profile"
      : isArabic
      ? "ملف المتابعة الصحية"
      : "Health Improvement Profile";

  const riskPattern =
    (priorityOrgan === "Heart" || priorityOrgan === "Metabolic") &&
    labScore !== null &&
    labScore !== undefined &&
    labScore < 75
      ? isArabic
        ? "نمط مخاطر قلبية وأيضية"
        : "Cardiometabolic Risk Pattern"
      : priorityOrgan === "Brain" ||
        (dailyCheckInScore !== null &&
          dailyCheckInScore !== undefined &&
          dailyCheckInScore < 65)
      ? isArabic
        ? "نمط التعافي والتوتر"
        : "Recovery & Stress Pattern"
      : overallScore >= 80
      ? isArabic
        ? "نمط صحة وقائية مستقر"
        : "Stable Preventive Health Pattern"
      : isArabic
      ? "نمط متابعة صحية عامة"
      : "General Health Monitoring Pattern";

  const opportunityTitle =
    priorityOrgan === "Heart"
      ? isArabic
        ? "تحسين صحة القلب"
        : "Improve Heart Health"
      : priorityOrgan === "Metabolic"
      ? isArabic
        ? "تحسين الصحة الأيضية"
        : "Improve Metabolic Health"
      : priorityOrgan === "Kidney"
      ? isArabic
        ? "دعم صحة الكلى"
        : "Support Kidney Health"
      : priorityOrgan === "Lung"
      ? isArabic
        ? "تحسين صحة الرئة"
        : "Improve Lung Health"
      : priorityOrgan === "Brain"
      ? isArabic
        ? "تحسين النوم والتعافي"
        : "Improve Sleep & Recovery"
      : isArabic
      ? "تعزيز الصحة الوقائية"
      : "Strengthen Preventive Health";

  const bestNextAction =
    priorityOrgan === "Heart"
      ? isArabic
        ? "راقب ضغط الدم والكوليسترول وابدأ نشاطًا بدنيًا منتظمًا."
        : "Monitor blood pressure and cholesterol, and start consistent physical activity."
      : priorityOrgan === "Metabolic"
      ? isArabic
        ? "ركز على ضبط السكر، التغذية، النشاط البدني، والوزن."
        : "Focus on glucose control, nutrition, physical activity, and healthy weight."
      : priorityOrgan === "Kidney"
      ? isArabic
        ? "تابع الترطيب، ضغط الدم، ووظائف الكلى عند الحاجة."
        : "Track hydration, blood pressure, and kidney function when needed."
      : priorityOrgan === "Lung"
      ? isArabic
        ? "قلل التعرض للتدخين والملوثات وراقب ضيق التنفس أو السعال."
        : "Reduce smoke and pollution exposure and monitor cough or shortness of breath."
      : priorityOrgan === "Brain"
      ? isArabic
        ? "حسن جودة النوم وقلل التوتر وحافظ على نشاط يومي."
        : "Improve sleep quality, reduce stress, and maintain daily activity."
      : isArabic
      ? "استمر في التقييمات والمتابعة الصحية المنتظمة."
      : "Continue assessments and regular health tracking.";

  const potentialGain =
    overallScore < 50
      ? 20
      : overallScore < 60
      ? 16
      : overallScore < 70
      ? 12
      : overallScore < 80
      ? 8
      : 4;

  const potentialScore = Math.min(100, overallScore + potentialGain);

  const potentialLevel =
    potentialGain >= 15
      ? isArabic
        ? "فرصة تحول كبيرة"
        : "Major Improvement Opportunity"
      : potentialGain >= 8
      ? isArabic
        ? "فرصة تحسين جيدة"
        : "Good Improvement Opportunity"
      : isArabic
      ? "فرصة تحسين محدودة"
      : "Limited Improvement Opportunity";

  const healthAgeStatus =
    overallScore >= 85
      ? isArabic
        ? "أصغر صحيًا من المتوقع"
        : "Younger Health Profile"
      : overallScore >= 70
      ? isArabic
        ? "عمر صحي متوازن"
        : "Balanced Health Age"
      : overallScore >= 50
      ? isArabic
        ? "عمر صحي يحتاج تحسين"
        : "Elevated Health Age"
      : isArabic
      ? "عمر صحي مرتفع"
      : "High Health Age";

  const healthAgeMessage =
    overallScore >= 85
      ? isArabic
        ? "مؤشراتك الحالية تعكس ملفًا صحيًا وقائيًا جيدًا."
        : "Your current indicators suggest a strong preventive health profile."
      : overallScore >= 70
      ? isArabic
        ? "مؤشراتك الحالية مقبولة مع وجود فرص للتحسين."
        : "Your current indicators are balanced with room for improvement."
      : overallScore >= 50
      ? isArabic
        ? "بعض المؤشرات قد تجعل ملفك الصحي يبدو أكبر من المتوقع."
        : "Some indicators may make your health profile appear older than expected."
      : isArabic
      ? "هناك عدة مؤشرات تحتاج إلى متابعة جدية لتحسين العمر الصحي."
      : "Several indicators need closer follow-up to improve your health age profile.";

  const trendDirection =
    overallScore >= 80
      ? isArabic
        ? "اتجاه صحي مستقر"
        : "Stable health direction"
      : overallScore >= 60
      ? isArabic
        ? "قابل للتحسن"
        : "Improvement potential"
      : isArabic
      ? "يحتاج متابعة"
      : "Needs close follow-up";

  const trendMessage =
    overallScore >= 80
      ? isArabic
        ? "المؤشرات الحالية تبدو مستقرة نسبيًا مع أهمية الاستمرار في الوقاية."
        : "Current indicators appear relatively stable with continued preventive focus."
      : overallScore >= 60
      ? isArabic
        ? "توجد فرصة واضحة لتحسين الاتجاه الصحي خلال الأسابيع القادمة."
        : "There is a clear opportunity to improve the health direction over the coming weeks."
      : isArabic
      ? "النتائج الحالية تشير إلى الحاجة لمتابعة أقرب وتحسين الأولويات الصحية."
      : "Current results suggest the need for closer follow-up and improvement of priority health areas.";

  const doctorBrief = isArabic
    ? `
الملف الصحي: ${healthProfile}

الحالة الحالية: ${overallScore}/100

منطقة الأولوية:
${priorityOrgan || "الصحة العامة"}

أقوى منطقة:
${strongestOrgan || "الصحة العامة"}

نمط المخاطر:
${riskPattern}

العمر الصحي:
${healthAgeStatus}

فرصة التحسين:
${opportunityTitle}

التحسن المحتمل:
+${potentialGain}

الإجراء الموصى به:
${bestNextAction}
`
    : `
Profile: ${healthProfile}

Current Status: ${overallScore}/100

Priority Area:
${priorityOrgan || "General Health"}

Strongest Area:
${strongestOrgan || "General Health"}

Risk Pattern:
${riskPattern}

Health Age:
${healthAgeStatus}

Main Opportunity:
${opportunityTitle}

Potential Gain:
+${potentialGain}

Recommended Action:
${bestNextAction}
`;

  return {
    healthProfile,
    riskPattern,
    opportunityTitle,
    bestNextAction,
    potentialGain,
    potentialScore,
    potentialLevel,
    healthAgeStatus,
    healthAgeMessage,
    trendDirection,
    trendMessage,
    doctorBrief,
  };
}