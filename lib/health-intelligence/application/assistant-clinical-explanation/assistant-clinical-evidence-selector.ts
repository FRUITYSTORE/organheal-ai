import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  AssistantClinicalExplanationMode,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

type LatestReportContext =
  NonNullable<
    AssistantResponseHealthContext["latestReportContext"]
  >;

export type AssistantClinicalConversationResponseScope =
  | "full-report"
  | "focused"
  | "legacy";

export type SelectAssistantClinicalExplanationEvidenceInput = {
  latestReport:
    LatestReportContext;

  mode:
    AssistantClinicalExplanationMode;

  responseScope:
    AssistantClinicalConversationResponseScope;

  focusedMarkerSubject?:
    string | null;
};

function normalizeMarkerTokens(
  value:
    string
): string[] {
  return value
    .toLowerCase()
    .split(
      /[\s_\-./():]+/
    )
    .map(
      (token) =>
        token.trim()
    )
    .filter(
      Boolean
    );
}

function markerMatchesSubject(
  marker:
    string,
  subject:
    string
): boolean {
  const markerTokens =
    normalizeMarkerTokens(
      marker
    );

  const subjectTokens =
    normalizeMarkerTokens(
      subject
    );

  if (
    subjectTokens.length ===
    0
  ) {
    return false;
  }

  if (
    markerTokens.join(" ") ===
    subjectTokens.join(" ")
  ) {
    return true;
  }

  return subjectTokens.every(
    (token) =>
      markerTokens.includes(
        token
      )
  );
}

/**
 * Selects report evidence for the current
 * conversational scope.
 *
 * Full report interpretation may use expanded
 * Parser v2 evidence for completeness.
 *
 * Focused marker questions narrow the evidence
 * to the resolved semantic marker when possible.
 *
 * If the semantic marker cannot be matched safely,
 * the selector falls back to the existing evidence
 * rather than dropping clinical context.
 */
export function selectAssistantClinicalExplanationEvidence(
  {
    latestReport,
    mode,
    responseScope,
    focusedMarkerSubject,
  }:
    SelectAssistantClinicalExplanationEvidenceInput
): LatestReportContext["reportEvidence"] {
  const expandedEvidence =
    latestReport
      .expandedReportEvidence;

  const shouldUseExpandedEvidence =
    mode ===
      "full" &&
    responseScope !==
      "focused" &&
    (
      expandedEvidence
        ?.length ??
      0
    ) >
      0;

  const selectedEvidence =
    shouldUseExpandedEvidence
      ? expandedEvidence!
      : latestReport
          .reportEvidence;

  if (
    responseScope !==
      "focused" ||
    !focusedMarkerSubject
      ?.trim()
  ) {
    return selectedEvidence;
  }

  const focusedEvidence =
    selectedEvidence.filter(
      (item) =>
        markerMatchesSubject(
          item.marker,
          focusedMarkerSubject
        )
    );

  /*
   * Never discard evidence only because semantic
   * wording does not match the report marker label.
   */
  return focusedEvidence.length >
    0
    ? focusedEvidence
    : selectedEvidence;
}