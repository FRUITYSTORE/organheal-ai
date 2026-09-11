import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  AssistantSemanticGoal,
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

export type AssistantActiveSubject = {
  kind:
    "marker";

  value:
    string;
};

export type AssistantClinicalContinuityState = {
  activeSubject:
    AssistantActiveSubject | null;

  clinicalGoal:
    AssistantSemanticGoal | null;
};

export type AssistantActiveSubjectContinuitySource =
  | "current-semantic"
  | "verified-prior"
  | "none";

export type ResolveAssistantActiveSubjectContinuityInput = {
  semanticRoutingDecision:
    AssistantSemanticRoutingDecision;

  healthContext:
    AssistantResponseHealthContext | null;

  /**
   * Marker names derived from an already authenticated,
   * server-built multi-report comparison.
   *
   * Never populate this from client input.
   */
  verifiedMarkerNames?:
    readonly string[];

  priorActiveSubject?:
    AssistantActiveSubject | null;

  allowPriorContinuity?:
    boolean;
};

export type ResolveAssistantActiveSubjectContinuityResult = {
  semanticRoutingDecision:
    AssistantSemanticRoutingDecision;

  state:
    AssistantClinicalContinuityState;

  source:
    AssistantActiveSubjectContinuitySource;
};

function normalizeMarker(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[\s_-]+/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function findVerifiedReportMarker(
  value:
    string,
  healthContext:
    AssistantResponseHealthContext | null,
  verifiedMarkerNames:
    readonly string[] = []
): string | null {
  const requestedMarker =
    normalizeMarker(
      value
    );

  if (
    !requestedMarker
  ) {
    return null;
  }

  const latestReport =
    healthContext
      ?.latestReportContext;

  const markerNames = [
    ...(
      latestReport
        ? [
            ...latestReport
              .reportEvidence,

            ...(
              latestReport
                .expandedReportEvidence ??
              []
            ),
          ].map(
            (
              item
            ) =>
              item.marker
          )
        : []
    ),

    ...verifiedMarkerNames,
  ];

  const match =
    markerNames.find(
      (
        marker
      ) =>
        normalizeMarker(
          marker
        ) ===
        requestedMarker
    );

  return (
    match ??
    null
  );
}

function hasResolvedCurrentSubject(
  decision:
    AssistantSemanticRoutingDecision
): boolean {
  const understanding =
    decision
      .understanding;

  if (
    !understanding ||
    understanding
      .referentStatus !==
      "resolved"
  ) {
    return false;
  }

  const {
    kind,
    value,
  } =
    understanding.subject;

  return Boolean(
    kind !== "unknown" &&
    kind !== "previous-topic" &&
    typeof value ===
      "string" &&
    value.trim()
  );
}

export function parseAssistantActiveSubjectHint(
  value:
    unknown
): AssistantActiveSubject | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const candidate =
    value as {
      kind?:
        unknown;

      value?:
        unknown;
    };

  if (
    candidate.kind !==
      "marker" ||
    typeof candidate.value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    candidate.value.trim();

  if (
    !normalizedValue ||
    normalizedValue.length >
      120
  ) {
    return null;
  }

  return {
    kind:
      "marker",

    value:
      normalizedValue,
  };
}

export function resolveAssistantActiveSubjectContinuity(
  input:
    ResolveAssistantActiveSubjectContinuityInput
): ResolveAssistantActiveSubjectContinuityResult {
  const decision =
    input.semanticRoutingDecision;

  const understanding =
    decision
      .understanding;

  const clinicalGoal =
    decision.domain ===
      "clinical_question"
      ? understanding
          ?.primaryGoal ??
        null
      : null;

  /*
   * Continuity is intentionally restricted to patient-specific
   * clinical questions.
   */
  if (
    decision.domain !==
      "clinical_question" ||
    !understanding
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal:
          null,
      },

      source:
        "none",
    };
  }

  /*
   * A currently resolved marker always wins.
   *
   * Before exposing it as reusable continuity state, canonicalize
   * it against authenticated report evidence.
   */
  if (
    understanding
      .referentStatus ===
      "resolved" &&
    understanding.subject
      .kind ===
      "marker" &&
    typeof understanding
      .subject.value ===
      "string"
  ) {
    const verifiedMarker =
      findVerifiedReportMarker(
        understanding
          .subject.value,
      input.healthContext,
      input.verifiedMarkerNames
      );

    if (
      verifiedMarker
    ) {
      return {
        semanticRoutingDecision:
          decision,

        state: {
          activeSubject: {
            kind:
              "marker",

            value:
              verifiedMarker,
          },

          clinicalGoal,
        },

        source:
          "current-semantic",
      };
    }
  }

  /*
   * Never overwrite another explicit resolved subject with prior
   * conversational state.
   */
  if (
    hasResolvedCurrentSubject(
      decision
    )
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal,
      },

      source:
        "none",
    };
  }

  /*
   * v1 intentionally does not inherit a subject during a
   * multi-report flow. Multi-report continuity is a separate
   * roadmap stage.
   */
  if (
    input.allowPriorContinuity ===
      false
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal,
      },

      source:
        "none",
    };
  }

  /*
   * A prior subject may resolve only a genuine follow-up.
   * A new independent question must never silently inherit it.
   */
  if (
    !understanding.isFollowUp &&
    !understanding
      .refersToPreviousTurn
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal,
      },

      source:
        "none",
    };
  }

  const priorActiveSubject =
    input.priorActiveSubject;

  if (
    !priorActiveSubject
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal,
      },

      source:
        "none",
    };
  }

  /*
   * The client-carried subject is only a hint.
   *
   * It becomes usable only after the marker is independently
   * verified against the authenticated active report.
   */
  const verifiedMarker =
    findVerifiedReportMarker(
      priorActiveSubject.value,
    input.healthContext,
    input.verifiedMarkerNames
    );

  if (
    !verifiedMarker
  ) {
    return {
      semanticRoutingDecision:
        decision,

      state: {
        activeSubject:
          null,

        clinicalGoal,
      },

      source:
        "none",
    };
  }

  const activeSubject:
    AssistantActiveSubject = {
      kind:
        "marker",

      value:
        verifiedMarker,
    };

  return {
    semanticRoutingDecision: {
      ...decision,

      understanding: {
        ...understanding,

        subject:
          activeSubject,

        referentStatus:
          "resolved",

        referentConfidence:
          "high",
      },
    },

    state: {
      activeSubject,

      /*
       * The goal belongs to the CURRENT turn.
       *
       * Example:
       * previous goal = cause
       * current message = "What should I do about it?"
       * current goal = next-step
       */
      clinicalGoal,
    },

    source:
      "verified-prior",
  };
}
