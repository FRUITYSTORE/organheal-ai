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
  clinicalPatterns.map(
    (pattern) =>
      isArabic
        ? {
            ...pattern,
            ...getArabicClinicalPattern(
              pattern
            ),
          }
        : pattern
  );

const severityRank: Record<
  string,
  number
> = {
  High: 3,
  Moderate: 2,
  Low: 1,
};

const prioritizedPatterns =
  [...localizedPatterns].sort(
    (left, right) =>
      (
        severityRank[
          String(
            right?.severity ??
              ""
          )
        ] ??
        0
      ) -
      (
        severityRank[
          String(
            left?.severity ??
              ""
          )
        ] ??
        0
      )
  );

  const summary =
    isRadiologyReport
      ? radiologySummary.summary
      : markerSummary.summary;

  const keyFindings =
    isRadiologyReport
      ? radiologySummary.riskSignals
      : markerSummary.keyFindings;

const riskSignals =
  prioritizedPatterns.length > 0
    ? prioritizedPatterns
        .map(
          (
            pattern,
            index
          ) => {
            const priorityLabel =
              isArabic
                ? index === 0
                  ? "الأولوية الأعلى"
                  : "نمط إضافي"
                : index === 0
                  ? "Top priority"
                  : "Additional pattern";

            const severityText =
              isArabic
                ? pattern?.severity ===
                  "High"
                  ? "مرتفع"
                  : pattern?.severity ===
                      "Moderate"
                    ? "متوسط"
                    : "منخفض"
                : String(
                    pattern?.severity ??
                      ""
                  );

            const evidence =
              Array.isArray(
                pattern
                  ?.involvedMarkers
              )
                ? pattern.involvedMarkers
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    )
                : "";

            return isArabic
              ? [
                  `${priorityLabel}: ${pattern.title}`,
                  `مستوى الانتباه: ${severityText}`,
                  `سبب الأهمية: ${pattern.summary}`,
                ].join(
                  "\n"
                )
              : [
                  `${priorityLabel}: ${pattern.title}`,
                  `Attention level: ${severityText}`,
                  `Why it matters: ${pattern.summary}`,
                  evidence
                    ? `Evidence: ${evidence}`
                    : "",
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    "\n"
                  );
          }
        )
        .join(
          "\n\n"
        )
    : markerSummary.riskSignals;

const recommendations =
  isRadiologyReport
    ? radiologySummary.recommendations
    : prioritizedPatterns.length > 0
      ? [
          ...prioritizedPatterns.map(
            (
              pattern,
              index
            ) =>
              `${index + 1}. ${
                pattern.suggestedFocus
              }`
          ),

          "",

          isArabic
            ? "توقيت المتابعة: يجب تحديد موعد إعادة الفحوصات أو المراجعة حسب المؤشرات غير الطبيعية، والأعراض، وعوامل الخطورة، وأي تغيير في العلاج."
            : "Follow-up timing: The timing of repeat testing or clinical review should be individualized according to the abnormal findings, symptoms, risk factors, and any treatment changes.",

          isArabic
            ? "مراجعة أبكر: اطلب مراجعة طبية أبكر إذا ظهرت أعراض جديدة أو متفاقمة أو إذا كان التقرير الأصلي يصف أي نتيجة بأنها حرجة."
            : "Earlier review: Seek earlier medical review if symptoms are new or worsening, or if the original report identifies any result as critical.",

          isArabic
            ? "حدود التفسير: تم بناء هذا التحليل من البيانات المستخرجة من التقرير والمعلومات الصحية المتاحة، ولا يمثل تشخيصًا نهائيًا."
            : "Limitations: This interpretation is based on the extracted report evidence and currently available health context and does not establish a final diagnosis.",
        ].join(
          "\n"
        )
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