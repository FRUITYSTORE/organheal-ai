import {
  generateIntelligenceFromText,
} from "@/lib/extractedTextIntelligence";

type IntelligenceLanguage =
  | "en"
  | "ar";

type BuildHealthInsightUpdateInput = {
  extractedText:
    string;

  reportType:
    string | null;

  markerSummary:
    any;

  radiologySummary:
    any;

  isRadiologyReport:
    boolean;

  clinicalPatterns:
    any[];

  unifiedHealth:
    any;

  language:
    IntelligenceLanguage;
};

function getArabicClinicalPattern(
  pattern: any
) {
  const translations: Record<
    string,
    {
      title: string;
      summary: string;
      suggestedFocus: string;
    }
  > = {
    "Liver Health Pattern": {
      title:
        "نمط صحة الكبد",

      summary:
        "قد تشير النتائج المرتبطة بالكبد إلى الحاجة لتقييم إنزيمات ووظائف الكبد ضمن السياق السريري الكامل.",

      suggestedFocus:
        "مراجعة تحاليل الكبد والأعراض والأدوية والمكملات، وإعادة الفحوصات حسب توصية الطبيب.",
    },

    "Cardiometabolic Risk Pattern": {
      title:
        "نمط الخطورة القلبية والاستقلابية",

      summary:
        "قد يشير نمط الدهون إلى زيادة عوامل الخطورة القلبية والاستقلابية، خصوصًا عند ارتفاع الدهون الثلاثية أو انخفاض HDL.",

      suggestedFocus:
        "التركيز على جودة التغذية والنشاط البدني وإدارة الوزن ومراجعة دهون الدم سريريًا.",
    },

    "Blood Sugar Control Pattern": {
      title:
        "نمط التحكم بسكر الدم",

      summary:
        "قد تشير مؤشرات الجلوكوز إلى ضعف التحكم بسكر الدم أو زيادة الخطورة الاستقلابية.",

      suggestedFocus:
        "مراجعة HbA1c والجلوكوز ضمن السياق السريري ونمط الغذاء والنشاط البدني.",
    },

    "Blood Count Review Pattern": {
      title:
        "نمط مراجعة تعداد الدم",

      summary:
        "قد تتطلب اضطرابات تعداد الدم تقييمًا للأسباب المحتملة مثل نقص الحديد أو العوامل الغذائية أو الالتهابية أو أسباب سريرية أخرى.",

      suggestedFocus:
        "مراجعة CBC ودراسات الحديد والفريتين وB12 أو الفولات حسب الحاجة السريرية.",
    },

    "Kidney Function Monitoring Pattern": {
      title:
        "نمط متابعة وظائف الكلى",

      summary:
        "قد تتطلب مؤشرات وظائف الكلى متابعة إضافية عند وجود ارتفاع في الكرياتينين أو انخفاض في eGFR.",

      suggestedFocus:
        "مراجعة الترطيب وضغط الدم ووظائف الكلى وفحوصات البول والأدوية مع الطبيب.",
    },
  };

  return (
    translations[
      String(
        pattern?.title ?? ""
      )
    ] ?? {
      title:
        String(
          pattern?.title ??
            "نمط سريري"
        ),

      summary:
        String(
          pattern?.summary ??
            ""
        ),

      suggestedFocus:
        String(
          pattern?.suggestedFocus ??
            ""
        ),
    }
  );
}

export function buildHealthInsightUpdate({
  extractedText,
  reportType,
  markerSummary,
  radiologySummary,
  isRadiologyReport,
  clinicalPatterns,
  unifiedHealth,
  language,
}: BuildHealthInsightUpdateInput) {
  const isArabic =
    language === "ar";

  const localizedPatterns =
    isArabic
      ? clinicalPatterns.map(
          getArabicClinicalPattern
        )
      : clinicalPatterns;

  const summary =
    isRadiologyReport
      ? radiologySummary.summary
      : markerSummary.summary;

  const keyFindings =
    isRadiologyReport
      ? radiologySummary.riskSignals
      : markerSummary.keyFindings;

  const riskSignals =
    localizedPatterns.length > 0
      ? localizedPatterns
          .map(
            (pattern) =>
              `${pattern.title}: ${pattern.summary}`
          )
          .join("\n")
      : markerSummary.riskSignals;

  const recommendations =
    isRadiologyReport
      ? radiologySummary.recommendations
      : localizedPatterns.length > 0
        ? localizedPatterns
            .map(
              (pattern) =>
                `${pattern.title}: ${pattern.suggestedFocus}`
            )
            .join("\n")
        : markerSummary.recommendations;

  const doctorBrief =
    isArabic
      ? `المؤشرات المخبرية المكتشفة:
${markerSummary.keyFindings}

تحليل الصحة الموحد:
${unifiedHealth.healthForecast}

الهدف ذو الأولوية:
${unifiedHealth.priorityGoal}

الخطوة التالية المقترحة:
${unifiedHealth.nextBestAction}

ملاحظة سريرية: هذا تفسير تثقيفي ويجب مراجعته مع مختص رعاية صحية مرخص ضمن السياق السريري الكامل.`
      : `Detected lab markers:
${markerSummary.keyFindings}

Unified Health Analysis:
${unifiedHealth.healthForecast}

Priority Goal:
${unifiedHealth.priorityGoal}

Next Best Action:
${unifiedHealth.nextBestAction}

Clinical note: This is an educational interpretation and should be reviewed by a licensed healthcare professional.`;

  return {
    ...generateIntelligenceFromText(
      extractedText,
      reportType
    ),

    ai_status:
      "Generated",

    summary,

    key_findings:
      keyFindings,

    risk_signals:
      riskSignals,

    recommendations,

    doctor_brief:
      doctorBrief,
  };
}