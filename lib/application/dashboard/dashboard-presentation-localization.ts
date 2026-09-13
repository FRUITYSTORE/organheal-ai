import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

const ORGAN_NAME_AR: Record<string, string> = {
  Heart: "القلب",
  Liver: "الكبد",
  Lung: "الرئة",
  Kidney: "الكلى",
  Brain: "الدماغ",
  Metabolic: "الأيض",
  General: "الصحة العامة",
  "General Health": "الصحة العامة",
};

function localizeOrganName(
  value: string
): string {
  const clean =
    value.trim();

  return (
    ORGAN_NAME_AR[clean] ??
    clean
  );
}

export function presentDashboardOrganName(
  value: string,
  isArabic: boolean
): string {
  if (!isArabic) {
    return value;
  }

  return localizeOrganName(
    value
  );
}

function extractScore(
  value: string
): string | null {
  const match =
    value.match(
      /(\d+(?:\.\d+)?)\/100/
    );

  return match?.[1] ?? null;
}

function extractAssessmentOrgan(
  finding: ClinicalFinding
): string | null {
  if (
    finding.id ===
    "assessment-critical-lowest"
  ) {
    const suffix =
      " needs priority attention";

    return finding.title.endsWith(
      suffix
    )
      ? finding.title.slice(
          0,
          -suffix.length
        )
      : null;
  }

  if (
    finding.id ===
    "assessment-warning-lowest"
  ) {
    const suffix =
      " is below target";

    return finding.title.endsWith(
      suffix
    )
      ? finding.title.slice(
          0,
          -suffix.length
        )
      : null;
  }

  return null;
}

function localizeAssessmentFinding(
  finding: ClinicalFinding
): ClinicalFinding {
  const rawOrgan =
    extractAssessmentOrgan(
      finding
    );

  const score =
    extractScore(
      finding.description
    );

if (!rawOrgan) {
  return finding;
}

  const organ =
    localizeOrganName(
      rawOrgan
    );

if (
  finding.id ===
  "assessment-critical-lowest"
) {
  return {
    ...finding,

    title:
      `${organ} يحتاج إلى اهتمام ذي أولوية`,

    description:
      score
        ? `${organ} لديه أدنى نتيجة في التقييم الصحي، وهي ${score}/100.`
        : `${organ} هو المجال الصحي الذي يحتاج إلى أكبر قدر من الاهتمام حاليًا وفق التقييمات المتاحة.`,
  };
}

return {
  ...finding,

  title:
    `${organ} أقل من المستوى المستهدف`,

  description:
    score
      ? `${organ} لديه أدنى نتيجة في التقييم الصحي، وهي ${score}/100.`
      : `${organ} هو المجال الصحي الأقل تقييمًا حاليًا وفق البيانات المتاحة.`,
};
}

function localizeCheckInFinding(
  finding: ClinicalFinding
): ClinicalFinding {
  const score =
    extractScore(
      finding.description
    );

  if (
    finding.id ===
    "checkin-missing"
  ) {
    return {
      ...finding,

      title:
        "التحديث الصحي غير محدث",

      description:
        "لا يوجد تحديث صحي حديث. تساعد التحديثات المنتظمة على تحسين دقة المتابعة.",
    };
  }

  if (
    finding.id ===
    "checkin-critical-low"
  ) {
    return {
      ...finding,

      title:
        "مؤشر العافية منخفض",

      description:
        score
          ? `أحدث مؤشر للعافية في التحديث الصحي هو ${score}/100.`
          : finding.description,
    };
  }

  if (
    finding.id ===
    "checkin-warning-low"
  ) {
    return {
      ...finding,

      title:
        "مؤشر العافية أقل من المستوى المستهدف",

      description:
        score
          ? `أحدث مؤشر للعافية في التحديث الصحي هو ${score}/100.`
          : finding.description,
    };
  }

  return finding;
}

function formatMarkerValue(
  finding: ClinicalFinding
): string | null {
  const evidence =
    finding.reportEvidence;

  if (!evidence) {
    return null;
  }

  return [
    evidence.markerValue,
    evidence.markerUnit,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== ""
    )
    .join(" ");
}

function formatReferenceRange(
  finding: ClinicalFinding
): string | null {
  const evidence =
    finding.reportEvidence;

  if (!evidence) {
    return null;
  }

  if (
    evidence.referenceLow !==
      null &&
    evidence.referenceHigh !==
      null
  ) {
    return `${evidence.referenceLow}-${evidence.referenceHigh}`;
  }

  if (
    evidence.referenceLow !==
    null
  ) {
    return `≥ ${evidence.referenceLow}`;
  }

  if (
    evidence.referenceHigh !==
    null
  ) {
    return `≤ ${evidence.referenceHigh}`;
  }

  return null;
}

function localizeReferenceSource(
  value:
    | "report"
    | "default"
    | null
): string | null {
  if (value === "report") {
    return "من التقرير";
  }

  if (value === "default") {
    return "مرجع افتراضي";
  }

  return null;
}

function localizeReportMarkerFinding(
  finding: ClinicalFinding
): ClinicalFinding {
  if (
    finding.id ===
    "report-markers-no-flags"
  ) {
    return {
      ...finding,

      title:
        "لم يتم رصد مؤشرات مستخرجة خارج النطاق المرجعي المتاح",

      description:
        "لم يتم تصنيف المؤشرات المستخرجة من التقرير على أنها مرتفعة أو منخفضة أو مكتشفة. ولا يغني ذلك عن مراجعة التقرير الطبي الأصلي كاملًا.",
    };
  }

  if (
    !finding.id.startsWith(
      "report-marker-"
    ) ||
    !finding.reportEvidence
  ) {
    return finding;
  }

  const evidence =
    finding.reportEvidence;

  const markerName =
    evidence.markerName;

  const result =
    formatMarkerValue(
      finding
    );

  const referenceRange =
    formatReferenceRange(
      finding
    );

  const referenceSource =
    localizeReferenceSource(
      evidence.referenceSource
    );

  let title =
    `${markerName} يحتاج إلى مراجعة`;

  if (
    evidence.markerStatus === "High"
  ) {
    title =
      `${markerName} أعلى من النطاق المرجعي المتاح`;
  } else if (
    evidence.markerStatus === "Low"
  ) {
    title =
      `${markerName} أقل من النطاق المرجعي المتاح`;
  } else if (
    evidence.markerStatus ===
    "Detected"
  ) {
    title =
      `تم اكتشاف ${markerName}`;
  }

  const referenceText =
    referenceRange
      ? ` النطاق المرجعي المتاح هو ${referenceRange}${
          evidence.markerUnit
            ? ` ${evidence.markerUnit}`
            : ""
        }${
          referenceSource
            ? ` (${referenceSource})`
            : ""
        }.`
      : "";

  return {
    ...finding,

    title,

    description:
      `${
        result
          ? `النتيجة المسجلة هي ${result}.`
          : ""
      }${referenceText} يجب تفسير هذه النتيجة ضمن السياق السريري للمريض وبالرجوع إلى تقرير المختبر الأصلي.`.trim(),
  };
}

export function localizeDashboardFinding(
  finding: ClinicalFinding,
  isArabic: boolean
): ClinicalFinding {
  if (!isArabic) {
    return finding;
  }

  switch (finding.id) {
    case "assessment-missing":
      return {
        ...finding,

        title:
          "التقييم الصحي غير مكتمل",

        description:
          "لا تتوفر بيانات لتقييم صحة الأعضاء حتى الآن. يساعد إكمال التقييم على تحسين جودة التحليل الصحي.",
      };

    case "assessment-critical-lowest":
    case "assessment-warning-lowest":
      return localizeAssessmentFinding(
        finding
      );

    case "assessment-stable":
      return {
        ...finding,

        title:
          "نتائج التقييم الصحي تبدو مستقرة",

        description:
          "نتائج تقييم صحة الأعضاء المتاحة حاليًا تقع ضمن نطاق أقل خطورة.",
      };

    case "checkin-missing":
    case "checkin-critical-low":
    case "checkin-warning-low":
      return localizeCheckInFinding(
        finding
      );

    case "report-markers-no-flags":
      return localizeReportMarkerFinding(
        finding
      );

    case "reports-analysis-pending":
      return {
        ...finding,

        title:
          "التقارير تحتاج إلى تحليل",

        description:
          "تم رفع تقارير طبية، ولكن لا يتوفر تحليل محفوظ بالذكاء الاصطناعي حتى الآن.",
      };

    case "intelligence-generated":
      return {
        ...finding,

        title:
          "يوجد تحليل صحي محفوظ",

        description:
          "يوجد تحليل صحي محفوظ واحد على الأقل متاح للمراجعة.",
      };

    default:
      if (
        finding.id.startsWith(
          "report-marker-"
        )
      ) {
        return localizeReportMarkerFinding(
          finding
        );
      }

      return finding;
  }
}

export function localizeDashboardFindings(
  findings: ClinicalFinding[],
  isArabic: boolean
): ClinicalFinding[] {
  if (!isArabic) {
    return findings;
  }

  return findings.map(
    (finding) =>
      localizeDashboardFinding(
        finding,
        true
      )
  );
}

export function localizeDashboardActionSummary(
  value:
    | string
    | null
    | undefined,
  isArabic: boolean
): string | null | undefined {
  if (
    !isArabic ||
    !value
  ) {
    return value;
  }

  switch (value) {
    case "Review this risk with a healthcare professional and keep your follow-up data updated.":
      return "راجع هذه المخاطر مع أحد المختصين في الرعاية الصحية، واحرص على تحديث بيانات المتابعة.";

    case "Follow your health plan and update Check-In regularly.":
      return "اتبع خطتك الصحية وحدّث بيانات المتابعة الصحية بانتظام.";

    case "Maintain healthy habits and continue routine follow-up.":
      return "حافظ على العادات الصحية واستمر في المتابعة الدورية.";

    default:
      return value;
  }
}
function humanizeDashboardCode(
  value: string
): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export function presentDashboardEvidenceStrength(
  value: string,
  isArabic: boolean
): string {
  const english: Record<string, string> = {
    "very-strong": "Very strong",
    strong: "Strong",
    moderate: "Moderate",
    limited: "Limited",
    weak: "Weak",
  };

  const arabic: Record<string, string> = {
    "very-strong": "قوية جدًا",
    strong: "قوية",
    moderate: "متوسطة",
    limited: "محدودة",
    weak: "ضعيفة",
  };

  if (isArabic) {
    return arabic[value] ?? "غير محددة";
  }

  return (
    english[value] ??
    humanizeDashboardCode(value)
  );
}

export function presentDashboardEvidenceState(
  value: string,
  isArabic: boolean
): string {
  const english: Record<string, string> = {
    excellent: "Excellent",
    good: "Good",
    developing: "Developing",
    limited: "Limited",
  };

  const arabic: Record<string, string> = {
    excellent: "ممتازة",
    good: "جيدة",
    developing: "قيد التطور",
    limited: "محدودة",
  };

  if (isArabic) {
    return arabic[value] ?? "غير محددة";
  }

  return (
    english[value] ??
    humanizeDashboardCode(value)
  );
}

const DASHBOARD_IMPACT_LABELS: Record<
  string,
  {
    en: string;
    ar: string;
  }
> = {
  "establish-health-baseline": {
    en: "Establish a health baseline",
    ar: "إنشاء خط أساس صحي",
  },

  "increase-source-coverage": {
    en: "Broaden health data coverage",
    ar: "توسيع نطاق البيانات الصحية",
  },

  "enable-trend-comparison": {
    en: "Enable health trend comparison",
    ar: "تمكين مقارنة الاتجاهات الصحية",
  },

  "strengthen-daily-context": {
    en: "Strengthen daily health context",
    ar: "تعزيز سياق الصحة اليومية",
  },

  "add-medical-evidence": {
    en: "Add medical evidence",
    ar: "إضافة أدلة طبية",
  },

  "enable-report-analysis": {
    en: "Enable medical report analysis",
    ar: "تمكين تحليل التقارير الطبية",
  },

  "improve-doctor-preparation": {
    en: "Improve doctor preparation",
    ar: "تحسين التحضير لزيارة الطبيب",
  },

  "complete-report-evidence": {
    en: "Complete report evidence",
    ar: "استكمال الأدلة من التقارير",
  },

  "strengthen-followup-history": {
    en: "Strengthen follow-up history",
    ar: "تعزيز سجل المتابعة الصحية",
  },

  "clarify-health-momentum": {
    en: "Clarify health direction",
    ar: "توضيح اتجاه الصحة",
  },

  "support-health-plan-review": {
    en: "Support health plan review",
    ar: "دعم مراجعة الخطة الصحية",
  },

  "establish-health-plan": {
    en: "Establish a health plan",
    ar: "إنشاء خطة صحية",
  },

  "maintain-plan-continuity": {
    en: "Maintain health plan continuity",
    ar: "الحفاظ على استمرارية الخطة الصحية",
  },
};

export function presentDashboardImpact(
  value: string | null,
  isArabic: boolean
): string {
  if (!value) {
    return isArabic
      ? "قيد التحديد"
      : "Not determined";
  }

  const label =
    DASHBOARD_IMPACT_LABELS[value];

  if (label) {
    return isArabic
      ? label.ar
      : label.en;
  }

  return isArabic
    ? "أثر صحي متوقع"
    : humanizeDashboardCode(value);
}