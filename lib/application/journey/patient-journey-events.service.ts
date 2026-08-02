import type {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type PatientSummary =
  Awaited<ReturnType<typeof getPatientSummary>>;

export type PatientJourneyEventType =
  | "report_uploaded"
  | "health_intelligence_generated"
  | "check_in_completed"
  | "health_history_updated";

export type PatientJourneyEventSource =
  | "report"
  | "intelligence"
  | "checkin"
  | "history";

export type PatientJourneyEventImportance =
  | "low"
  | "medium"
  | "high";

export type PatientJourneyEvent = {
  id: string;

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
  patientSummary:
    PatientSummary;
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

function buildCheckInEvents(
  patientSummary: PatientSummary
): PatientJourneyEvent[] {
  return patientSummary.recentCheckIns
    .filter((checkIn) =>
      isValidDate(
        checkIn.created_at
      )
    )
    .map((checkIn, index) => ({
      id:
        `checkin-${checkIn.created_at}-${index}`,

      type:
        "check_in_completed" as const,

      occurredAt:
        checkIn.created_at,

      title:
        "Health Check-In completed",

      description:
        `A wellness score of ${checkIn.wellness_score}/100 was recorded.`,

      source:
        "checkin" as const,

      importance:
        "medium" as const,
    }));
}

function buildReportEvents(
  patientSummary: PatientSummary
): PatientJourneyEvent[] {
  return patientSummary.uploadedReports
    .filter((report) =>
      isValidDate(
        report.created_at
      )
    )
    .map((report, index) => ({
      id:
        `report-${report.id ?? index}`,

      type:
        "report_uploaded" as const,

      occurredAt:
        report.created_at,

      title:
        "Medical report uploaded",

      description:
        report.file_name
          ? `${report.file_name} was added to the health journey.`
          : "A medical report was added to the health journey.",

      source:
        "report" as const,

      importance:
        "high" as const,
    }));
}

function buildIntelligenceEvents(
  patientSummary: PatientSummary
): PatientJourneyEvent[] {
  return patientSummary.healthInsights
    .filter((insight) =>
      isValidDate(
        insight.created_at
      )
    )
    .map((insight, index) => ({
      id:
        `intelligence-${insight.id ?? index}`,

      type:
        "health_intelligence_generated" as const,

      occurredAt:
        insight.created_at,

      title:
        insight.insight_title?.trim() ||
        "Health intelligence generated",

      description:
        "Updated health intelligence was generated from available health evidence.",

      source:
        "intelligence" as const,

      importance:
        "high" as const,
    }));
}

function buildHistoryEvents(
  patientSummary: PatientSummary
): PatientJourneyEvent[] {
  return patientSummary.historyItems
    .filter((item) =>
      isValidDate(
        item.created_at
      )
    )
    .map((item, index) => ({
      id:
        `history-${item.id ?? index}`,

      type:
        "health_history_updated" as const,

      occurredAt:
        item.created_at,

      title:
        item.module_name
          ? `${item.module_name} health record updated`
          : "Health history updated",

      description:
        typeof item.score === "number"
          ? `A health history score of ${item.score}/100 was recorded.`
          : "A new item was added to the connected health history.",

      source:
        "history" as const,

      importance:
        "low" as const,
    }));
}

export function buildPatientJourneyEvents({
  patientSummary,
}: BuildPatientJourneyEventsInput): PatientJourneyEvent[] {
  const events = [
    ...buildCheckInEvents(
      patientSummary
    ),

    ...buildReportEvents(
      patientSummary
    ),

    ...buildIntelligenceEvents(
      patientSummary
    ),

    ...buildHistoryEvents(
      patientSummary
    ),
  ];

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