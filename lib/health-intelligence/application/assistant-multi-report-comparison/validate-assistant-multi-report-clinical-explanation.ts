import type {
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import type {
  AssistantMultiReportClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.types";

function isRecord(
  value:
    unknown
): value is
  Record<string, unknown> {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function isNonEmptyString(
  value:
    unknown
): value is
  string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isConfidence(
  value:
    unknown
): boolean {
  return (
    value === "low" ||
    value === "moderate" ||
    value === "high"
  );
}

function isImportance(
  value:
    unknown
): boolean {
  return (
    value === "monitor" ||
    value === "important" ||
    value === "prompt"
  );
}

function isStringArray(
  value:
    unknown,
  maxItems:
    number
): value is
  string[] {
  return (
    Array.isArray(
      value
    ) &&
    value.length <=
      maxItems &&
    value.every(
      isNonEmptyString
    )
  );
}

export function validateAssistantMultiReportClinicalExplanation(
  raw:
    unknown,
  comparison:
    PatientClinicalLongitudinalComparison
): AssistantMultiReportClinicalExplanation | null {
  if (
    !isRecord(
      raw
    )
  ) {
    return null;
  }

  const allowedMarkers =
    new Set(
      comparison
        .markerSeries
        .filter(
          (
            series
          ) =>
            series.comparable
        )
        .map(
          (
            series
          ) =>
            series.marker
        )
    );

  if (
    !isNonEmptyString(
      raw.overview
    ) ||
    !Array.isArray(
      raw.importantChanges
    ) ||
    raw.importantChanges.length >
      6 ||
    !Array.isArray(
      raw.patterns
    ) ||
    raw.patterns.length >
      5 ||
    !Array.isArray(
      raw.possibleContributors
    ) ||
    raw.possibleContributors.length >
      4 ||
    !isStringArray(
      raw.missingContext,
      6
    ) ||
    !isStringArray(
      raw.nextSteps,
      6
    ) ||
    !isStringArray(
      raw.questionsForClinician,
      5
    ) ||
    !isStringArray(
      raw.limitations,
      6
    ) ||
    raw.limitations.length ===
      0
  ) {
    return null;
  }

  for (
    const change of
    raw.importantChanges
  ) {
    if (
      !isRecord(
        change
      ) ||
      !isNonEmptyString(
        change.marker
      ) ||
      !allowedMarkers.has(
        change.marker
      ) ||
      !isNonEmptyString(
        change.explanation
      ) ||
      !isImportance(
        change.importance
      ) ||
      !isConfidence(
        change.confidence
      )
    ) {
      return null;
    }
  }

  for (
    const pattern of
    raw.patterns
  ) {
    if (
      !isRecord(
        pattern
      ) ||
      !Array.isArray(
        pattern.markers
      ) ||
      pattern.markers.length <
        2 ||
      pattern.markers.length >
        6 ||
      !pattern.markers.every(
        (
          marker
        ) =>
          isNonEmptyString(
            marker
          ) &&
          allowedMarkers.has(
            marker
          )
      ) ||
      !isNonEmptyString(
        pattern.explanation
      ) ||
      !isConfidence(
        pattern.confidence
      )
    ) {
      return null;
    }
  }

  for (
    const contributor of
    raw.possibleContributors
  ) {
    if (
      !isRecord(
        contributor
      ) ||
      !isNonEmptyString(
        contributor.factor
      ) ||
      !isNonEmptyString(
        contributor.whyPossible
      ) ||
      !isNonEmptyString(
        contributor.confirmationNeeded
      )
    ) {
      return null;
    }
  }

  return raw as
    AssistantMultiReportClinicalExplanation;
}