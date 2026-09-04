import type {
  AssistantClinicalExplanation,
  AssistantClinicalExplanationLanguage,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

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
            `الأدلة من التقرير: ${finding.evidenceMarkers.join(", ")}`,
            `درجة الثقة: ${finding.confidence}`,
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
            `Confidence: ${finding.confidence}`,
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
  if (
    mode ===
    "next-step"
  ) {
    return language === "ar"
      ? renderArabicNextStep(
          explanation
        )
      : renderEnglishNextStep(
          explanation
        );
  }

  if (
    mode ===
    "cause-reasoning"
  ) {
    return language === "ar"
      ? renderArabicCauseReasoning(
          explanation
        )
      : renderEnglishCauseReasoning(
          explanation
        );
  }

  return language === "ar"
    ? renderArabic(
        explanation
      )
    : renderEnglish(
        explanation
      );
}