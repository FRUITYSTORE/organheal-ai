import type {
  ClinicalLongitudinalTrend,
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import type {
  AssistantMultiReportClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.types";

function renderTrend(
  trend:
    ClinicalLongitudinalTrend,
  language:
    "ar" | "en"
): string {
  if (
    language ===
    "ar"
  ) {
    switch (
      trend
    ) {
      case "improved":
        return "تحسن";

      case "worsened":
        return "تدهور";

      case "stable":
        return "مستقر";

      case "mixed":
        return "متذبذب";

      case "insufficient":
        return "غير كافٍ للحكم";
    }
  }

  switch (
    trend
  ) {
    case "improved":
      return "improved";

    case "worsened":
      return "worsened";

    case "stable":
      return "stable";

    case "mixed":
      return "mixed";

    case "insufficient":
      return "insufficient";
  }
}

export function renderAssistantMultiReportClinicalExplanation(
  explanation:
    AssistantMultiReportClinicalExplanation,
  comparison:
    PatientClinicalLongitudinalComparison,
  language:
    "ar" | "en"
): string {
  const seriesByMarker =
    new Map(
      comparison
        .markerSeries
        .map(
          (
            series
          ) => [
            series.marker,
            series,
          ]
        )
    );

  if (
    language ===
    "ar"
  ) {
    const sections:
      string[] = [
        explanation.overview,
      ];

    if (
      explanation
        .importantChanges
        .length >
      0
    ) {
      sections.push(
        [
          "أهم التغيّرات:",
          ...explanation
            .importantChanges
            .map(
              (
                change
              ) => {
                const series =
                  seriesByMarker.get(
                    change.marker
                  );

                const trend =
                  series
                    ? renderTrend(
                        series.clinicalTrend,
                        language
                      )
                    : "غير محدد";

                return `• ${change.marker} [${trend}]: ${change.explanation}`;
              }
            ),
        ].join(
          "\n"
        )
      );
    }

    if (
      explanation.patterns.length >
      0
    ) {
      sections.push(
        [
          "العلاقات أو الأنماط المهمة:",
          ...explanation.patterns.map(
            (
              pattern
            ) =>
              `• ${pattern.explanation}`
          ),
        ].join(
          "\n"
        )
      );
    }

    if (
      explanation
        .possibleContributors
        .length >
      0
    ) {
      sections.push(
        [
          "عوامل محتملة تحتاج للتأكد:",
          ...explanation
            .possibleContributors
            .map(
              (
                item
              ) =>
                `• ${item.factor}: ${item.whyPossible} ${item.confirmationNeeded}`
            ),
        ].join(
          "\n"
        )
      );
    }

    if (
      explanation.nextSteps.length >
      0
    ) {
      sections.push(
        [
          "ما الذي يستحق المتابعة؟",
          ...explanation.nextSteps.map(
            (
              item
            ) =>
              `• ${item}`
          ),
        ].join(
          "\n"
        )
      );
    }

    if (
      explanation
        .questionsForClinician
        .length >
      0
    ) {
      sections.push(
        [
          "أسئلة مفيدة للطبيب:",
          ...explanation
            .questionsForClinician
            .map(
              (
                item
              ) =>
                `• ${item}`
            ),
        ].join(
          "\n"
        )
      );
    }

    if (
      explanation
        .missingContext
        .length >
      0
    ) {
      sections.push(
        [
          "معلومات قد تغيّر التفسير:",
          ...explanation
            .missingContext
            .map(
              (
                item
              ) =>
                `• ${item}`
            ),
        ].join(
          "\n"
        )
      );
    }

    sections.push(
      explanation.limitations
        .map(
          (
            item
          ) =>
            `• ${item}`
        )
        .join(
          "\n"
        )
    );

    return sections.join(
      "\n\n"
    );
  }

  const sections:
    string[] = [
      explanation.overview,
    ];

  if (
    explanation
      .importantChanges
      .length >
    0
  ) {
    sections.push(
      [
        "Most important changes:",
        ...explanation
          .importantChanges
          .map(
            (
              change
            ) => {
              const series =
                seriesByMarker.get(
                  change.marker
                );

              const trend =
                series
                  ? renderTrend(
                      series.clinicalTrend,
                      language
                    )
                  : "unknown";

              return `• ${change.marker} [${trend}]: ${change.explanation}`;
            }
          ),
      ].join(
        "\n"
      )
    );
  }

  if (
    explanation.patterns.length >
    0
  ) {
    sections.push(
      [
        "Important patterns:",
        ...explanation.patterns.map(
          (
            pattern
          ) =>
            `• ${pattern.explanation}`
        ),
      ].join(
        "\n"
      )
    );
  }

  if (
    explanation.nextSteps.length >
    0
  ) {
    sections.push(
      [
        "What to follow up:",
        ...explanation.nextSteps.map(
          (
            item
          ) =>
            `• ${item}`
        ),
      ].join(
        "\n"
      )
    );
  }

  if (
    explanation
      .missingContext
      .length >
    0
  ) {
    sections.push(
      [
        "Context that could change the interpretation:",
        ...explanation
          .missingContext
          .map(
            (
              item
            ) =>
              `• ${item}`
          ),
      ].join(
        "\n"
      )
    );
  }

  sections.push(
    explanation.limitations
      .map(
        (
          item
        ) =>
          `• ${item}`
      )
      .join(
        "\n"
      )
  );

  return sections.join(
    "\n\n"
  );
}