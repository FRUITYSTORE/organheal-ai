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
};

/**
 * Selects the report evidence that is safe and useful
 * for the current conversational scope.
 *
 * Full report interpretation may use Parser v2 expanded
 * evidence for completeness.
 *
 * Focused conversational questions must stay on the
 * already-focused report evidence instead of expanding
 * back into the entire report.
 *
 * Legacy full-mode behavior remains unchanged when
 * semantic conversation scope is unavailable.
 */
export function selectAssistantClinicalExplanationEvidence(
  {
    latestReport,
    mode,
    responseScope,
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

  if (
    shouldUseExpandedEvidence
  ) {
    return expandedEvidence!;
  }

  return latestReport
    .reportEvidence;
}
