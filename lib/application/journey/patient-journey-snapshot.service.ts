import type {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import type {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type PatientSummary =
  Awaited<ReturnType<typeof getPatientSummary>>;

type HealthIntelligence =
  ReturnType<typeof buildHealthIntelligence>;

export type PatientJourneyFollowUpStatus =
  | "up_to_date"
  | "follow_up_needed"
  | "unknown";

export type PatientJourneyUpdateSource =
  | "check_in"
  | "report"
  | "intelligence"
  | "history"
  | "unknown";

export type PatientJourneySnapshot = {
  currentPriority:
    | string
    | null;

  nextAction:
    | string
    | null;

  latestCheckIn:
    PatientSummary["latestCheckIn"];

  latestReport:
    PatientSummary["uploadedReports"][number]
    | null;

  latestIntelligence:
    PatientSummary["healthInsights"][number]
    | null;

  latestHistoryItem:
    PatientSummary["historyItems"][number]
    | null;

  followUpStatus:
    PatientJourneyFollowUpStatus;

  lastMeaningfulUpdate:
    | {
        source:
          PatientJourneyUpdateSource;

        occurredAt:
          string;
      }
    | null;

  lastUpdated:
    | string
    | null;
};

export type BuildPatientJourneySnapshotInput = {
  patientSummary:
    PatientSummary;

  healthIntelligence:
    HealthIntelligence;
};

type DatedJourneyEvent = {
  source:
    PatientJourneyUpdateSource;

  occurredAt:
    string;
};

function getPrimaryActionText(
  healthIntelligence: HealthIntelligence
): string | null {
  const primaryAction =
    healthIntelligence
      .recommendations
      .data
      .primaryAction;

  return (
    primaryAction.description ||
    primaryAction.title ||
    null
  );
}

function normalizeDate(
  value:
    | string
    | null
    | undefined
): string | null {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return value;
}

function getLatestEvent(
  events: DatedJourneyEvent[]
): DatedJourneyEvent | null {
  const validEvents =
    events.filter((event) =>
      Boolean(
        normalizeDate(
          event.occurredAt
        )
      )
    );

  if (validEvents.length === 0) {
    return null;
  }

  return [...validEvents].sort(
    (left, right) =>
      new Date(
        right.occurredAt
      ).getTime() -
      new Date(
        left.occurredAt
      ).getTime()
  )[0];
}

function getFollowUpStatus(
  latestCheckIn:
    PatientSummary["latestCheckIn"]
): PatientJourneyFollowUpStatus {
  if (!latestCheckIn?.created_at) {
    return "follow_up_needed";
  }

  const latestCheckInTime =
    new Date(
      latestCheckIn.created_at
    ).getTime();

  if (
    Number.isNaN(
      latestCheckInTime
    )
  ) {
    return "unknown";
  }

  const ageInDays =
    (
      Date.now() -
      latestCheckInTime
    ) /
    (
      1000 *
      60 *
      60 *
      24
    );

  return ageInDays <= 7
    ? "up_to_date"
    : "follow_up_needed";
}

export function buildPatientJourneySnapshot({
  patientSummary,
  healthIntelligence,
}: BuildPatientJourneySnapshotInput): PatientJourneySnapshot {
  const latestCheckIn =
    patientSummary.latestCheckIn;

  const latestReport =
    patientSummary.uploadedReports[0] ??
    null;

  const latestIntelligence =
    patientSummary.healthInsights[0] ??
    null;

  const latestHistoryItem =
    patientSummary.historyItems[0] ??
    null;

  const events:
    DatedJourneyEvent[] = [];

  if (latestCheckIn?.created_at) {
    events.push({
      source:
        "check_in",

      occurredAt:
        latestCheckIn.created_at,
    });
  }

  if (latestReport?.created_at) {
    events.push({
      source:
        "report",

      occurredAt:
        latestReport.created_at,
    });
  }

  if (latestIntelligence?.created_at) {
    events.push({
      source:
        "intelligence",

      occurredAt:
        latestIntelligence.created_at,
    });
  }

  if (latestHistoryItem?.created_at) {
    events.push({
      source:
        "history",

      occurredAt:
        latestHistoryItem.created_at,
    });
  }

  const lastMeaningfulUpdate =
    getLatestEvent(events);

  return {
    currentPriority:
      healthIntelligence
        .priority
        .data
        .priorityOrgan ??
      null,

    nextAction:
      getPrimaryActionText(
        healthIntelligence
      ),

    latestCheckIn,

    latestReport,

    latestIntelligence,

    latestHistoryItem,

    followUpStatus:
      getFollowUpStatus(
        latestCheckIn
      ),

    lastMeaningfulUpdate,

    lastUpdated:
      lastMeaningfulUpdate
        ?.occurredAt ??
      null,
  };
}