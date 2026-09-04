import type {
  AssistantReportEvidenceItem,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  AssistantClinicalExplanation,
  AssistantClinicalExplanationConfidence,
  AssistantClinicalExplanationPriority,
  AssistantClinicalExplanationUrgency,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

const TOP_LEVEL_KEYS = [
  "overview",
  "priorityFindings",
  "relationships",
  "possibleContributors",
  "reassuringFindings",
  "missingContext",
  "nextSteps",
  "questionsForClinician",
  "urgency",
  "limitations",
];

const FINDING_KEYS = [
  "title",
  "explanation",
  "evidenceMarkers",
  "importance",
  "confidence",
];

const RELATIONSHIP_KEYS = [
  "markers",
  "explanation",
  "confidence",
];

const CONTRIBUTOR_KEYS = [
  "factor",
  "whyPossible",
  "confirmationNeeded",
];

function isRecord(
  value:
    unknown
): value is UnknownRecord {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function hasOnlyKeys(
  record:
    UnknownRecord,
  allowedKeys:
    string[]
): boolean {
  return Object.keys(
    record
  ).every(
    (key) =>
      allowedKeys.includes(
        key
      )
  );
}

function isNonEmptyString(
  value:
    unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isStringArray(
  value:
    unknown,
  options: {
    minItems?: number;
    maxItems: number;
  }
): value is string[] {
  if (
    !Array.isArray(
      value
    ) ||
    value.length >
      options.maxItems ||
    value.length <
      (options.minItems ?? 0)
  ) {
    return false;
  }

  return value.every(
    isNonEmptyString
  );
}

function isConfidence(
  value:
    unknown
): value is
  AssistantClinicalExplanationConfidence {
  return (
    value === "low" ||
    value === "moderate" ||
    value === "high"
  );
}

function isPriority(
  value:
    unknown
): value is
  AssistantClinicalExplanationPriority {
  return (
    value === "monitor" ||
    value === "important" ||
    value === "prompt"
  );
}

function isUrgency(
  value:
    unknown
): value is
  AssistantClinicalExplanationUrgency {
  return (
    value === "routine" ||
    value === "timely" ||
    value === "urgent" ||
    value === "emergency"
  );
}

function normalizeMarkerName(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function buildAllowedMarkerSet(
  evidence:
    AssistantReportEvidenceItem[]
): Set<string> {
  return new Set(
    evidence
      .map(
        (item) =>
          normalizeMarkerName(
            item.marker
          )
      )
      .filter(Boolean)
  );
}

function referencesOnlyAllowedMarkers(
  markerNames:
    string[],
  allowedMarkers:
    Set<string>
): boolean {
  return markerNames.every(
    (markerName) =>
      allowedMarkers.has(
        normalizeMarkerName(
          markerName
        )
      )
  );
}

function isValidFinding(
  value:
    unknown,
  allowedMarkers:
    Set<string>
): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      FINDING_KEYS
    ) ||
    !isNonEmptyString(
      value.title
    ) ||
    !isNonEmptyString(
      value.explanation
    ) ||
    !isStringArray(
      value.evidenceMarkers,
      {
        minItems:
          1,

        maxItems:
          8,
      }
    ) ||
    !referencesOnlyAllowedMarkers(
      value.evidenceMarkers,
      allowedMarkers
    ) ||
    !isPriority(
      value.importance
    ) ||
    !isConfidence(
      value.confidence
    )
  ) {
    return false;
  }

  return true;
}

function isValidRelationship(
  value:
    unknown,
  allowedMarkers:
    Set<string>
): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      RELATIONSHIP_KEYS
    ) ||
    !isStringArray(
      value.markers,
      {
        minItems:
          2,

        maxItems:
          8,
      }
    ) ||
    !referencesOnlyAllowedMarkers(
      value.markers,
      allowedMarkers
    ) ||
    !isNonEmptyString(
      value.explanation
    ) ||
    !isConfidence(
      value.confidence
    )
  ) {
    return false;
  }

  return true;
}

function isValidContributor(
  value:
    unknown
): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(
      value,
      CONTRIBUTOR_KEYS
    ) &&
    isNonEmptyString(
      value.factor
    ) &&
    isNonEmptyString(
      value.whyPossible
    ) &&
    isNonEmptyString(
      value.confirmationNeeded
    )
  );
}

export type AssistantClinicalExplanationValidationReason =
  | "invalid_top_level_shape"
  | "invalid_overview"
  | "invalid_priority_findings"
  | "invalid_priority_finding_shape"
  | "priority_finding_unknown_marker"
  | "invalid_relationships"
  | "invalid_relationship_shape"
  | "relationship_unknown_marker"
  | "invalid_possible_contributors"
  | "invalid_reassuring_findings"
  | "invalid_missing_context"
  | "invalid_next_steps"
  | "invalid_questions_for_clinician"
  | "invalid_urgency"
  | "invalid_limitations"
  | "unknown_validation_failure";

export function diagnoseAssistantClinicalExplanationValidationFailure(
  value:
    unknown,
  reportEvidence:
    AssistantReportEvidenceItem[]
): AssistantClinicalExplanationValidationReason | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      TOP_LEVEL_KEYS
    )
  ) {
    return "invalid_top_level_shape";
  }

  const allowedMarkers =
    buildAllowedMarkerSet(
      reportEvidence
    );

  if (
    !isNonEmptyString(
      value.overview
    )
  ) {
    return "invalid_overview";
  }

  if (
    !Array.isArray(
      value.priorityFindings
    ) ||
    value.priorityFindings.length >
      5
  ) {
    return "invalid_priority_findings";
  }

  for (
    const finding of
    value.priorityFindings
  ) {
    if (
      !isRecord(finding) ||
      !hasOnlyKeys(
        finding,
        FINDING_KEYS
      ) ||
      !isNonEmptyString(
        finding.title
      ) ||
      !isNonEmptyString(
        finding.explanation
      ) ||
      !isStringArray(
        finding.evidenceMarkers,
        {
          minItems:
            1,

          maxItems:
            8,
        }
      ) ||
      !isPriority(
        finding.importance
      ) ||
      !isConfidence(
        finding.confidence
      )
    ) {
      return "invalid_priority_finding_shape";
    }

    if (
      !referencesOnlyAllowedMarkers(
        finding.evidenceMarkers,
        allowedMarkers
      )
    ) {
      return "priority_finding_unknown_marker";
    }
  }

  if (
    !Array.isArray(
      value.relationships
    ) ||
    value.relationships.length >
      5
  ) {
    return "invalid_relationships";
  }

  for (
    const relationship of
    value.relationships
  ) {
    if (
      !isRecord(
        relationship
      ) ||
      !hasOnlyKeys(
        relationship,
        RELATIONSHIP_KEYS
      ) ||
      !isStringArray(
        relationship.markers,
        {
          minItems:
            2,

          maxItems:
            8,
        }
      ) ||
      !isNonEmptyString(
        relationship.explanation
      ) ||
      !isConfidence(
        relationship.confidence
      )
    ) {
      return "invalid_relationship_shape";
    }

    if (
      !referencesOnlyAllowedMarkers(
        relationship.markers,
        allowedMarkers
      )
    ) {
      return "relationship_unknown_marker";
    }
  }

  if (
    !Array.isArray(
      value.possibleContributors
    ) ||
    value.possibleContributors.length >
      6 ||
    !value.possibleContributors.every(
      isValidContributor
    )
  ) {
    return "invalid_possible_contributors";
  }

  if (
    !isStringArray(
      value.reassuringFindings,
      {
        maxItems:
          8,
      }
    )
  ) {
    return "invalid_reassuring_findings";
  }

  if (
    !isStringArray(
      value.missingContext,
      {
        maxItems:
          8,
      }
    )
  ) {
    return "invalid_missing_context";
  }

  if (
    !isStringArray(
      value.nextSteps,
      {
        maxItems:
          6,
      }
    )
  ) {
    return "invalid_next_steps";
  }

  if (
    !isStringArray(
      value.questionsForClinician,
      {
        maxItems:
          6,
      }
    )
  ) {
    return "invalid_questions_for_clinician";
  }

  if (
    !isUrgency(
      value.urgency
    )
  ) {
    return "invalid_urgency";
  }

  if (
    !isStringArray(
      value.limitations,
      {
        minItems:
          1,

        maxItems:
          6,
      }
    )
  ) {
    return "invalid_limitations";
  }

  return "unknown_validation_failure";
}

export function validateAssistantClinicalExplanation(
  value:
    unknown,
  reportEvidence:
    AssistantReportEvidenceItem[]
): AssistantClinicalExplanation | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      TOP_LEVEL_KEYS
    )
  ) {
    return null;
  }

  const allowedMarkers =
    buildAllowedMarkerSet(
      reportEvidence
    );

  if (
    !isNonEmptyString(
      value.overview
    ) ||
    !Array.isArray(
      value.priorityFindings
    ) ||
    value.priorityFindings.length >
      5 ||
    !value.priorityFindings.every(
      (finding) =>
        isValidFinding(
          finding,
          allowedMarkers
        )
    ) ||
    !Array.isArray(
      value.relationships
    ) ||
    value.relationships.length >
      5 ||
    !value.relationships.every(
      (relationship) =>
        isValidRelationship(
          relationship,
          allowedMarkers
        )
    ) ||
    !Array.isArray(
      value.possibleContributors
    ) ||
    value.possibleContributors.length >
      6 ||
    !value.possibleContributors.every(
      isValidContributor
    ) ||
    !isStringArray(
      value.reassuringFindings,
      {
        maxItems:
          8,
      }
    ) ||
    !isStringArray(
      value.missingContext,
      {
        maxItems:
          8,
      }
    ) ||
    !isStringArray(
      value.nextSteps,
      {
        maxItems:
          6,
      }
    ) ||
    !isStringArray(
      value.questionsForClinician,
      {
        maxItems:
          6,
      }
    ) ||
    !isUrgency(
      value.urgency
    ) ||
    !isStringArray(
      value.limitations,
      {
        minItems:
          1,

        maxItems:
          6,
      }
    )
  ) {
    return null;
  }

  return value as
    AssistantClinicalExplanation;
}