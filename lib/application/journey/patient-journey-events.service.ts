import type {
  PatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

export type PatientJourneyEventType =
  | "report_uploaded"
  | "health_intelligence_generated"
  | "check_in_completed";

export type PatientJourneyEventSource =
  | "report"
  | "intelligence"
  | "checkin";

export type PatientJourneyEventImportance =
  | "low"
  | "medium"
  | "high";

export type PatientJourneyEvent = {
  type:
    PatientJourneyEventType;

  occurredAt:
    string;

  title:
    string;

  description:
    string;

  source:
    PatientJourneyEventSource;

  importance:
    PatientJourneyEventImportance;
};

export type BuildPatientJourneyEventsInput = {
  patientJourney:
    PatientJourneySnapshot;
};

function isValidDate(
  value:
    | string
    | null
    | undefined
): value is string {
  if (!value) {
    return false;
  }

  return !Number.isNaN(
    new Date(value).getTime()
  );
}

export function buildPatientJourneyEvents({
  patientJourney,
}: BuildPatientJourneyEventsInput): PatientJourneyEvent[] {
  const events:
    PatientJourneyEvent[] = [];

  if (
    isValidDate(
      patientJourney
        .latestCheckIn
        ?.created_at
    )
  ) {
    events.push({
      type:
        "check_in_completed",

      occurredAt:
        patientJourney
          .latestCheckIn
          .created_at,

      title:
        "Health check-in completed",

      description:
        "A wellness check-in was added to the patient journey.",

      source:
        "checkin",

      importance:
        "medium",
    });
  }

  if (
    isValidDate(
      patientJourney
        .latestReport
        ?.created_at
    )
  ) {
    events.push({
      type:
        "report_uploaded",

      occurredAt:
        patientJourney
          .latestReport
          .created_at,

      title:
        "Medical report uploaded",

      description:
        "A medical report was added and is available for review.",

      source:
        "report",

      importance:
        "high",
    });
  }

  if (
    isValidDate(
      patientJourney
        .latestIntelligence
        ?.created_at
    )
  ) {
    events.push({
      type:
        "health_intelligence_generated",

      occurredAt:
        patientJourney
          .latestIntelligence
          .created_at,

      title:
        "Health intelligence generated",

      description:
        "Updated health intelligence was generated from available evidence.",

      source:
        "intelligence",

      importance:
        "high",
    });
  }

  return events.sort(
    (left, right) =>
      new Date(
        right.occurredAt
      ).getTime() -
      new Date(
        left.occurredAt
      ).getTime()
  );
}