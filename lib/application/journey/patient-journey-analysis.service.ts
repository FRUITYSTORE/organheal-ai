import type {
  PatientJourneyEvent,
} from "@/lib/application/journey/patient-journey-events.service";

import type {
  PatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

export type PatientJourneyAnalysis = {
  latestReport:
    PatientJourneySnapshot["latestReport"];

  latestReportDate:
    | string
    | null;

  eventsAfterLatestReport:
    PatientJourneyEvent[];

  latestMeaningfulEvent:
    | PatientJourneyEvent
    | null;

  daysSinceLatestReport:
    | number
    | null;

  hasMeaningfulChange:
    boolean;

  followUpRecommended:
    boolean;
};

export type BuildPatientJourneyAnalysisInput = {
  patientJourney:
    PatientJourneySnapshot;

  patientJourneyEvents:
    PatientJourneyEvent[];

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

function calculateDaysSince(
  dateValue: string,
  now: Date
): number | null {
  const timestamp =
    getTimestamp(dateValue);

  if (timestamp === null) {
    return null;
  }

  const difference =
    now.getTime() -
    timestamp;

  if (difference < 0) {
    return 0;
  }

  return Math.floor(
    difference /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function sortEventsNewestFirst(
  events: PatientJourneyEvent[]
): PatientJourneyEvent[] {
  return [...events].sort(
    (left, right) =>
      (
        getTimestamp(
          right.occurredAt
        ) ??
        0
      ) -
      (
        getTimestamp(
          left.occurredAt
        ) ??
        0
      )
  );
}

export function buildPatientJourneyAnalysis({
  patientJourney,
  patientJourneyEvents,
  now = new Date(),
}: BuildPatientJourneyAnalysisInput): PatientJourneyAnalysis {
  const latestReport =
    patientJourney.latestReport;

  const latestReportDate =
    latestReport?.created_at ??
    null;

  const latestReportTimestamp =
    getTimestamp(
      latestReportDate
    );

  const validEvents =
    patientJourneyEvents.filter(
      (event) =>
        getTimestamp(
          event.occurredAt
        ) !== null
    );

  const eventsAfterLatestReport =
    latestReportTimestamp === null
      ? []
      : sortEventsNewestFirst(
          validEvents.filter(
            (event) => {
              const eventTimestamp =
                getTimestamp(
                  event.occurredAt
                );

              return (
                eventTimestamp !== null &&
                eventTimestamp >
                  latestReportTimestamp
              );
            }
          )
        );

  const latestMeaningfulEvent =
    eventsAfterLatestReport[0] ??
    null;

  return {
    latestReport,

    latestReportDate,

    eventsAfterLatestReport,

    latestMeaningfulEvent,

    daysSinceLatestReport:
      latestReportDate
        ? calculateDaysSince(
            latestReportDate,
            now
          )
        : null,

    hasMeaningfulChange:
      eventsAfterLatestReport.length >
      0,

    followUpRecommended:
      patientJourney.followUpStatus ===
      "follow_up_needed",
  };
}