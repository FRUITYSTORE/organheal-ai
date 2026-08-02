import type {
  PatientJourneyAnalysis,
} from "@/lib/application/journey/patient-journey-analysis.service";

import type {
  PatientJourneyEvent,
} from "@/lib/application/journey/patient-journey-events.service";

export type PatientJourneyReasoningState =
  | "no_report"
  | "no_change_after_report"
  | "recent_change"
  | "follow_up_due"
  | "active_follow_up";

export type PatientJourneyReasoningPriority =
  | "low"
  | "medium"
  | "high";

export type PatientJourneyReasoningSignal = {
  code:
    | "report_available"
    | "events_after_report"
    | "recent_checkin"
    | "new_intelligence"
    | "history_updated"
    | "follow_up_due";

  priority:
    PatientJourneyReasoningPriority;

  event:
    | PatientJourneyEvent
    | null;
};

export type PatientJourneyReasoning = {
  state:
    PatientJourneyReasoningState;

  priority:
    PatientJourneyReasoningPriority;

  primarySignal:
    | PatientJourneyReasoningSignal
    | null;

  supportingSignals:
    PatientJourneyReasoningSignal[];

  latestEventAfterReport:
    | PatientJourneyEvent
    | null;

  eventsAfterReportCount:
    number;

  hasRecentActivity:
    boolean;

  followUpRecommended:
    boolean;

  requiresUserAction:
    boolean;
};

export type BuildPatientJourneyReasoningInput = {
  analysis:
    PatientJourneyAnalysis;

  recentActivityWindowDays?:
    number;

  now?:
    Date;
};

function getTimestamp(
  value:
    | string
    | null
    | undefined
): number | null {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? null
    : timestamp;
}

function occurredWithinDays(
  value: string,
  days: number,
  now: Date
): boolean {
  const timestamp =
    getTimestamp(value);

  if (timestamp === null) {
    return false;
  }

  const difference =
    now.getTime() -
    timestamp;

  if (difference < 0) {
    return true;
  }

  return (
    difference <=
    days *
      24 *
      60 *
      60 *
      1000
  );
}

function getEventSignal(
  event: PatientJourneyEvent
): PatientJourneyReasoningSignal {
  switch (event.type) {
    case "check_in_completed":
      return {
        code:
          "recent_checkin",

        priority:
          "medium",

        event,
      };

    case "health_intelligence_generated":
      return {
        code:
          "new_intelligence",

        priority:
          "high",

        event,
      };

    case "health_history_updated":
      return {
        code:
          "history_updated",

        priority:
          "low",

        event,
      };

    case "report_uploaded":
      return {
        code:
          "report_available",

        priority:
          "medium",

        event,
      };
  }
}

function getHighestPriority(
  signals: PatientJourneyReasoningSignal[]
): PatientJourneyReasoningPriority {
  if (
    signals.some(
      (signal) =>
        signal.priority === "high"
    )
  ) {
    return "high";
  }

  if (
    signals.some(
      (signal) =>
        signal.priority === "medium"
    )
  ) {
    return "medium";
  }

  return "low";
}

export function buildPatientJourneyReasoning({
  analysis,
  recentActivityWindowDays = 7,
  now = new Date(),
}: BuildPatientJourneyReasoningInput): PatientJourneyReasoning {
  const eventSignals =
    analysis.eventsAfterLatestReport.map(
      getEventSignal
    );

  const followUpSignal:
    PatientJourneyReasoningSignal | null =
      analysis.followUpRecommended
        ? {
            code:
              "follow_up_due",

            priority:
              "high",

            event:
              null,
          }
        : null;

  const supportingSignals = [
    ...(followUpSignal
      ? [followUpSignal]
      : []),

    ...eventSignals,
  ];

  const latestEventAfterReport =
    analysis.latestMeaningfulEvent;

  const hasRecentActivity =
    latestEventAfterReport
      ? occurredWithinDays(
          latestEventAfterReport.occurredAt,
          recentActivityWindowDays,
          now
        )
      : false;

  let state:
    PatientJourneyReasoningState;

  if (!analysis.latestReport) {
    state =
      "no_report";
  } else if (
    analysis.followUpRecommended
  ) {
    state =
      "follow_up_due";
  } else if (
    analysis.eventsAfterLatestReport.length ===
    0
  ) {
    state =
      "no_change_after_report";
  } else if (hasRecentActivity) {
    state =
      "recent_change";
  } else {
    state =
      "active_follow_up";
  }

  const primarySignal =
    supportingSignals[0] ??
    null;

  return {
    state,

    priority:
      getHighestPriority(
        supportingSignals
      ),

    primarySignal,

    supportingSignals,

    latestEventAfterReport,

    eventsAfterReportCount:
      analysis
        .eventsAfterLatestReport
        .length,

    hasRecentActivity,

    followUpRecommended:
      analysis.followUpRecommended,

    requiresUserAction:
      analysis.followUpRecommended ||
      state ===
        "no_change_after_report",
  };
}