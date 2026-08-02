import type {
  PatientJourneySnapshot,
  PatientJourneyUpdateSource,
} from "@/lib/application/journey/patient-journey-snapshot.service";

export type PatientJourneyChangeType =
  | "report_uploaded"
  | "checkin_completed"
  | "intelligence_generated"
  | "history_updated";

export type PatientJourneyChangeImportance =
  | "low"
  | "medium"
  | "high";

export type PatientJourneyChange = {
  type:
    PatientJourneyChangeType;

  title:
    string;

  description:
    string;

  occurredAt:
    string;

  importance:
    PatientJourneyChangeImportance;
};

export type BuildLatestJourneyChangeInput = {
  patientJourney:
    PatientJourneySnapshot;
};

function mapSourceToChange(
  source: PatientJourneyUpdateSource,
  occurredAt: string
): PatientJourneyChange | null {
  switch (source) {
    case "check_in":
      return {
        type:
          "checkin_completed",

        title:
          "Latest health check-in completed",

        description:
          "The patient's latest wellness update is now part of the current health journey.",

        occurredAt,

        importance:
          "medium",
      };

    case "report":
      return {
        type:
          "report_uploaded",

        title:
          "New medical report uploaded",

        description:
          "A newly uploaded report is now available for review and health intelligence processing.",

        occurredAt,

        importance:
          "high",
      };

    case "intelligence":
      return {
        type:
          "intelligence_generated",

        title:
          "New health intelligence generated",

        description:
          "Updated health intelligence is now available from the latest saved evidence.",

        occurredAt,

        importance:
          "high",
      };

    case "history":
      return {
        type:
          "history_updated",

        title:
          "Health history updated",

        description:
          "A new health history event is now included in the patient journey.",

        occurredAt,

        importance:
          "low",
      };

    default:
      return null;
  }
}

export function buildLatestJourneyChange({
  patientJourney,
}: BuildLatestJourneyChangeInput): PatientJourneyChange | null {
  const latestUpdate =
    patientJourney.lastMeaningfulUpdate;

  if (!latestUpdate) {
    return null;
  }

  return mapSourceToChange(
    latestUpdate.source,
    latestUpdate.occurredAt
  );
}