import type {
  AssistantClinicalExplanation,
  AssistantClinicalExplanationLanguage,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

const ARABIC_MARKER_NAMES:
  Record<string, string> = {
    Glucose:
      "سكر الدم (Glucose)",

    HbA1c:
      "السكر التراكمي (HbA1c)",

    LDL:
      "الكوليسترول الضار (LDL)",

    HDL:
      "الكوليسترول الجيد (HDL)",

    Triglycerides:
      "الدهون الثلاثية",

    "Total Cholesterol":
      "الكوليسترول الكلي",

    Ferritin:
      "مخزون الحديد (Ferritin)",

    Iron:
      "الحديد",

    "Serum Iron":
      "الحديد في الدم",

    "Transferrin Saturation":
      "نسبة تشبع الترانسفيرين",

    ALT:
      "إنزيم الكبد ALT",

    AST:
      "إنزيم الكبد AST",

    eGFR:
      "كفاءة ترشيح الكلى (eGFR)",

    Creatinine:
      "الكرياتينين",

    Potassium:
      "البوتاسيوم",

    Sodium:
      "الصوديوم",

    "Vitamin D":
      "فيتامين د",

    "Vitamin B12":
      "فيتامين ب12",

    "Urine ACR":
      "نسبة الألبومين إلى الكرياتينين في البول (ACR)",

    "hs-CRP":
      "مؤشر الالتهاب عالي الحساسية (hs-CRP)",
  };

function renderArabicMarker(
  marker:
    string
): string {
  return (
    ARABIC_MARKER_NAMES[
      marker
    ] ??
    marker
  );
}

function renderArabicConfidence(
  confidence:
    string
): string {
  switch (
    confidence.toLowerCase()
  ) {
    case "high":
      return "عالية";

    case "medium":
      return "متوسطة";

    case "low":
      return "منخفضة";

    default:
      return confidence;
  }
}

function escapeRegExp(
  value:
    string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function localizeArabicClinicalText(
  value:
    string
): string {
  let localized =
    value;

  const entries =
    Object.entries(
      ARABIC_MARKER_NAMES
    )
      .sort(
        (
          [left],
          [right]
        ) =>
          right.length -
          left.length
      );

  for (
    const [
      marker,
      arabicName,
    ] of entries
  ) {
    const pattern =
      new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(
          marker
        )}(?![\\p{L}\\p{N}])`,
        "giu"
      );

    localized =
      localized.replace(
        pattern,
        arabicName
      );
  }

  return localized
    .replace(
      /\bHigh\b/gi,
      "مرتفع"
    )
    .replace(
      /\bLow\b/gi,
      "منخفض"
    )
    .replace(
      /\bNormal\b/gi,
      "طبيعي"
    )
    .replace(
      /\bDetected\b/gi,
      "موجود"
    )
    .replace(
      /\bBorderline\b/gi,
      "حدّي"
    );
}

function localizeArabicExplanation(
  explanation:
    AssistantClinicalExplanation
): AssistantClinicalExplanation {
  return {
    ...explanation,

    overview:
      localizeArabicClinicalText(
        explanation.overview
      ),

    priorityFindings:
      explanation
        .priorityFindings
        .map(
          (finding) => ({
            ...finding,

            title:
              localizeArabicClinicalText(
                finding.title
              ),

            explanation:
              localizeArabicClinicalText(
                finding.explanation
              ),
          })
        ),

    relationships:
      explanation
        .relationships
        .map(
          (relationship) => ({
            ...relationship,

            explanation:
              localizeArabicClinicalText(
                relationship.explanation
              ),
          })
        ),

    possibleContributors:
      explanation
        .possibleContributors
        .map(
          (contributor) => ({
            ...contributor,

            factor:
              localizeArabicClinicalText(
                contributor.factor
              ),

            whyPossible:
              localizeArabicClinicalText(
                contributor.whyPossible
              ),

            confirmationNeeded:
              localizeArabicClinicalText(
                contributor.confirmationNeeded
              ),
          })
        ),

    reassuringFindings:
      explanation
        .reassuringFindings
        .map(
          localizeArabicClinicalText
        ),

    missingContext:
      explanation
        .missingContext
        .map(
          localizeArabicClinicalText
        ),

    nextSteps:
      explanation
        .nextSteps
        .map(
          localizeArabicClinicalText
        ),

    questionsForClinician:
      explanation
        .questionsForClinician
        .map(
          localizeArabicClinicalText
        ),

    limitations:
      explanation
        .limitations
        .map(
          localizeArabicClinicalText
        ),
  };
}

function renderList(
  items:
    string[]
): string {
  return items
    .map(
      (item) =>
        `• ${item}`
    )
    .join("\n");
}

function renderArabicNextStep(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [];

  if (
    explanation.nextSteps.length >
    0
  ) {
    sections.push(
      `ما أنصحك به الآن:\n${renderList(
        explanation.nextSteps
      )}`
    );
  }

  if (
    explanation.questionsForClinician.length >
    0
  ) {
    sections.push(
      `أسئلة مفيدة عند مراجعة الطبيب:\n${renderList(
        explanation.questionsForClinician
      )}`
    );
  }

  sections.push(
    `مهم:\n${renderList(
      explanation.limitations
    )}`
  );

  return sections.join(
    "\n\n"
  );
}

function renderEnglishNextStep(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [];

  if (
    explanation.nextSteps.length >
    0
  ) {
    sections.push(
      `What I suggest you do next:\n${renderList(
        explanation.nextSteps
      )}`
    );
  }

  if (
    explanation.questionsForClinician.length >
    0
  ) {
    sections.push(
      `Useful questions for your clinician:\n${renderList(
        explanation.questionsForClinician
      )}`
    );
  }

  sections.push(
    `Important:\n${renderList(
      explanation.limitations
    )}`
  );

  return sections.join(
    "\n\n"
  );
}

function renderArabic(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [
      `الخلاصة:\n${explanation.overview}`,
  ];

  if (
    explanation.priorityFindings.length >
    0
  ) {
    sections.push(
      [
        "ما الذي يستحق الاهتمام أولًا:",
        ...explanation.priorityFindings.map(
         (finding) => [
           `• ${finding.title}`,
          finding.explanation,
        `الأدلة من التقرير: ${finding.evidenceMarkers
          .map(
          renderArabicMarker
        )
        .join("، ")}`,
        `درجة الثقة: ${renderArabicConfidence(
          finding.confidence
       )}`,
      ].join("\n")
    ),
      ].join("\n\n")
    );
  }

  if (
    explanation.relationships.length >
    0
  ) {
    sections.push(
      [
        "كيف ترتبط النتائج:",
        ...explanation.relationships.map(
          (relationship) =>
            `• ${relationship.markers
  .map(
    renderArabicMarker
  )
  .join(" + ")}: ${relationship.explanation}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.possibleContributors.length >
    0
  ) {
    sections.push(
      [
        "عوامل محتملة تحتاج إلى تأكيد:",
        ...explanation.possibleContributors.map(
          (contributor) => [
            `• ${contributor.factor}`,
            contributor.whyPossible,
            `ما يلزم للتأكد: ${contributor.confirmationNeeded}`,
          ].join("\n")
        ),
      ].join("\n\n")
    );
  }

  if (
    explanation.reassuringFindings.length >
    0
  ) {
    sections.push(
      `نتائج مطمئنة:\n${renderList(
        explanation.reassuringFindings
      )}`
    );
  }

  if (
    explanation.missingContext.length >
    0
  ) {
    sections.push(
      `معلومات قد تغيّر التفسير:\n${renderList(
        explanation.missingContext
      )}`
    );
  }

  if (
    explanation.nextSteps.length >
    0
  ) {
    sections.push(
      `الخطوات التالية:\n${renderList(
        explanation.nextSteps
      )}`
    );
  }

  if (
    explanation.questionsForClinician.length >
    0
  ) {
    sections.push(
      `أسئلة مفيدة للطبيب:\n${renderList(
        explanation.questionsForClinician
      )}`
    );
  }

  sections.push(
    `حدود هذا التفسير:\n${renderList(
      explanation.limitations
    )}`
  );

  return sections.join(
    "\n\n"
  );
}

function sanitizeUserFacingText(
  value:
    string
): string {
  return value
    .replace(
      /Review extracted report text and generate deeper structured intelligence\.?/gi,
      ""
    )
    .replace(
      /This laboratory marker was extracted from this uploaded report\.?/gi,
      ""
    )
    .replace(
      /Report text extracted and prepared for doctor-ready summarization\.?/gi,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

function renderEnglish(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [
      `Summary:\n${explanation.overview}`,
  ];

  if (
    explanation.priorityFindings.length >
    0
  ) {
    sections.push(
      [
        "What deserves attention first:",
        ...explanation.priorityFindings.map(
          (finding) => [
            `• ${finding.title}`,
            finding.explanation,
            `Evidence from the report: ${finding.evidenceMarkers.join(", ")}`,
            `Confidence: ${finding.confidence}`
          ].join("\n")
        ),
      ].join("\n\n")
    );
  }

  if (
    explanation.relationships.length >
    0
  ) {
    sections.push(
      [
        "How the findings relate:",
        ...explanation.relationships.map(
          (relationship) =>
            `• ${relationship.markers.join(" + ")}: ${relationship.explanation}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.possibleContributors.length >
    0
  ) {
    sections.push(
      [
        "Possible contributors requiring confirmation:",
        ...explanation.possibleContributors.map(
          (contributor) => [
            `• ${contributor.factor}`,
            contributor.whyPossible,
            `What would help confirm it: ${contributor.confirmationNeeded}`,
          ].join("\n")
        ),
      ].join("\n\n")
    );
  }

  if (
    explanation.reassuringFindings.length >
    0
  ) {
    sections.push(
      `Reassuring findings:\n${renderList(
        explanation.reassuringFindings
      )}`
    );
  }

  if (
    explanation.missingContext.length >
    0
  ) {
    sections.push(
      `Information that could change the interpretation:\n${renderList(
        explanation.missingContext
      )}`
    );
  }

  if (
    explanation.nextSteps.length >
    0
  ) {
    sections.push(
      `Suggested next steps:\n${renderList(
        explanation.nextSteps
      )}`
    );
  }

  if (
    explanation.questionsForClinician.length >
    0
  ) {
    sections.push(
      `Useful questions for your clinician:\n${renderList(
        explanation.questionsForClinician
      )}`
    );
  }

  sections.push(
    `Interpretation limits:\n${renderList(
      explanation.limitations
    )}`
  );

  return sections.join(
    "\n\n"
  );
}

function renderArabicCauseReasoning(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [
      explanation.overview,
    ];

  if (
    explanation.relationships.length >
    0
  ) {
    sections.push(
      [
        "كيف قد ترتبط النتائج:",
        ...explanation.relationships.map(
          (relationship) =>
            `• ${relationship.explanation}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.possibleContributors.length >
    0
  ) {
    sections.push(
      [
        "ما الذي قد يفسر هذا النمط:",
        ...explanation.possibleContributors.map(
          (contributor) =>
            `• ${contributor.factor}: ${contributor.whyPossible}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.missingContext.length >
    0
  ) {
    sections.push(
      [
        "ما الذي نحتاج معرفته قبل الاستنتاج:",
        ...explanation.missingContext
          .slice(0, 3)
          .map(
            (item) =>
              `• ${item}`
          ),
      ].join("\n")
    );
  }

  sections.push(
    `مهم:\n${explanation.limitations[0]}`
  );

  return sections.join(
    "\n\n"
  );
}

function renderEnglishCauseReasoning(
  explanation:
    AssistantClinicalExplanation
): string {
  const sections:
    string[] = [
      explanation.overview,
    ];

  if (
    explanation.relationships.length >
    0
  ) {
    sections.push(
      [
        "How the findings may relate:",
        ...explanation.relationships.map(
          (relationship) =>
            `• ${relationship.explanation}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.possibleContributors.length >
    0
  ) {
    sections.push(
      [
        "What may contribute to this pattern:",
        ...explanation.possibleContributors.map(
          (contributor) =>
            `• ${contributor.factor}: ${contributor.whyPossible}`
        ),
      ].join("\n")
    );
  }

  if (
    explanation.missingContext.length >
    0
  ) {
    sections.push(
      [
        "What we still need to know:",
        ...explanation.missingContext
          .slice(0, 3)
          .map(
            (item) =>
              `• ${item}`
          ),
      ].join("\n")
    );
  }

  sections.push(
    `Important:\n${explanation.limitations[0]}`
  );

  return sections.join(
    "\n\n"
  );
}

export function renderAssistantClinicalExplanation(
  explanation:
    AssistantClinicalExplanation,
  language:
    AssistantClinicalExplanationLanguage,
  mode:
    | "full"
    | "next-step"
    | "cause-reasoning" =
      "full"
): string {
  const presentationExplanation =
    language === "ar"
      ? localizeArabicExplanation(
          explanation
        )
      : explanation;

  let rendered:
    string;

  if (
    mode ===
    "next-step"
  ) {
    rendered =
      language === "ar"
        ? renderArabicNextStep(
            presentationExplanation
          )
        : renderEnglishNextStep(
            explanation
          );

    return sanitizeUserFacingText(
      rendered
    );
  }

  if (
    mode ===
    "cause-reasoning"
  ) {
    rendered =
      language === "ar"
        ? renderArabicCauseReasoning(
            presentationExplanation
          )
        : renderEnglishCauseReasoning(
            explanation
          );

    return sanitizeUserFacingText(
      rendered
    );
  }

  rendered =
    language === "ar"
      ? renderArabic(
          presentationExplanation
        )
      : renderEnglish(
          explanation
        );

  return sanitizeUserFacingText(
    rendered
  );
}