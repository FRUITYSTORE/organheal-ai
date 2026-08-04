import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  createPatientSummaryFixture,
} from "@/tests/fixtures/patient-summary.fixture";

import type {
  PatientSummary,
} from "@/lib/models/patient";

const FIXED_NOW =
  new Date(
    "2026-08-04T12:00:00.000Z"
  );

function createCheckIn(
  createdAt:
    string
): NonNullable<
  PatientSummary["latestCheckIn"]
> {
  return {
    mood:
      "Good",

    wellness_score:
      75,

    created_at:
      createdAt,
  };
}

function createReport(
  createdAt:
    string
): PatientSummary["uploadedReports"][number] {
  return {
    id:
      101,

    file_name:
      "journey-report.pdf",

    file_path:
      "journey-user/journey-report.pdf",

    report_type:
      "lab",

    extraction_status:
      "Completed",

    extracted_text:
      "Readable report evidence for the patient journey.",

    created_at:
      createdAt,

    extracted_at:
      createdAt,
  };
}

function createInsight(
  createdAt:
    string
): PatientSummary["healthInsights"][number] {
  return {
    id:
      201,

    report_id:
      101,

    insight_title:
      "Journey intelligence",

    summary:
      "The report was analyzed.",

    key_findings:
      "No critical finding.",

    recommendations:
      "Continue routine follow-up.",

    doctor_brief:
      "Routine follow-up is appropriate.",

    ai_status:
      "Generated",

    risk_level:
      "stable",

    next_best_action:
      "Continue the current health plan.",

    report_type:
      "lab",

    created_at:
      createdAt,
  };
}

function createHistoryItem(
  createdAt:
    string
): PatientSummary["historyItems"][number] {
  return {
    id:
      "301",

    module_name:
      "Heart",

    score:
      72,

    status:
      "Stable",

    created_at:
      createdAt,
  };
}

function buildJourney(
  patient:
    PatientSummary
) {
  const intelligence =
    buildHealthIntelligence(
      patient
    );

  const journey =
    buildPatientJourneySnapshot({
      patientSummary:
        patient,

      healthIntelligence:
        intelligence,
    });

  return {
    intelligence,
    journey,
  };
}

describe(
  "patient journey consistency regression",
  () => {
    beforeAll(
      () => {
        vi.useFakeTimers();

        vi.setSystemTime(
          FIXED_NOW
        );
      }
    );

    afterAll(
      () => {
        vi.useRealTimers();
      }
    );

    it(
      "marks follow-up as needed when no Check-In exists",
      () => {
        const patient =
          createPatientSummaryFixture();

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.latestCheckIn
        ).toBeNull();

        expect(
          journey.followUpStatus
        ).toBe(
          "follow_up_needed"
        );
      }
    );

    it(
      "marks follow-up as up to date when the latest Check-In is seven days old or newer",
      () => {
        const latestCheckIn =
          createCheckIn(
            "2026-07-29T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],
          });

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.followUpStatus
        ).toBe(
          "up_to_date"
        );

        expect(
          journey.latestCheckIn
        ).toBe(
          latestCheckIn
        );
      }
    );

    it(
      "marks follow-up as needed when the latest Check-In is older than seven days",
      () => {
        const latestCheckIn =
          createCheckIn(
            "2026-07-20T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],
          });

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.followUpStatus
        ).toBe(
          "follow_up_needed"
        );
      }
    );

    it(
      "returns unknown follow-up status when the Check-In date is invalid",
      () => {
        const latestCheckIn =
          createCheckIn(
            "invalid-date"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],
          });

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.followUpStatus
        ).toBe(
          "unknown"
        );
      }
    );

    it(
      "uses the newest valid journey event as the last meaningful update",
      () => {
        const latestCheckIn =
          createCheckIn(
            "2026-08-01T08:00:00.000Z"
          );

        const latestReport =
          createReport(
            "2026-08-02T08:00:00.000Z"
          );

        const latestInsight =
          createInsight(
            "2026-08-03T08:00:00.000Z"
          );

        const latestHistoryItem =
          createHistoryItem(
            "2026-08-04T08:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],

            uploadedReports: [
              latestReport,
            ],

            healthInsights: [
              latestInsight,
            ],

            historyItems: [
              latestHistoryItem,
            ],
          });

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.latestReport
        ).toBe(
          latestReport
        );

        expect(
          journey.latestIntelligence
        ).toBe(
          latestInsight
        );

        expect(
          journey.latestHistoryItem
        ).toBe(
          latestHistoryItem
        );

        expect(
          journey.lastMeaningfulUpdate
        ).toEqual({
          source:
            "history",

          occurredAt:
            "2026-08-04T08:00:00.000Z",
        });

        expect(
          journey.lastUpdated
        ).toBe(
          "2026-08-04T08:00:00.000Z"
        );
      }
    );

    it(
      "ignores invalid event dates when selecting the latest meaningful update",
      () => {
        const latestCheckIn =
          createCheckIn(
            "invalid-checkin-date"
          );

        const latestReport =
          createReport(
            "2026-08-02T08:00:00.000Z"
          );

        const latestInsight =
          createInsight(
            "invalid-intelligence-date"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],

            uploadedReports: [
              latestReport,
            ],

            healthInsights: [
              latestInsight,
            ],
          });

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.lastMeaningfulUpdate
        ).toEqual({
          source:
            "report",

          occurredAt:
            "2026-08-02T08:00:00.000Z",
        });

        expect(
          journey.lastUpdated
        ).toBe(
          "2026-08-02T08:00:00.000Z"
        );
      }
    );

    it(
      "keeps the journey next action synchronized with the Health Intelligence primary action",
      () => {
        const patient =
          createPatientSummaryFixture();

        const {
          intelligence,
          journey,
        } =
          buildJourney(
            patient
          );

        const primaryAction =
          intelligence.recommendations
            .data.primaryAction;

        expect(
          journey.nextAction
        ).toBe(
          primaryAction.description ||
            primaryAction.title ||
            null
        );

        expect(
          journey.currentPriority
        ).toBe(
          intelligence.priority.data
            .priorityOrgan ??
            null
        );
      }
    );

    it(
      "returns no meaningful update when all journey event collections are empty",
      () => {
        const patient =
          createPatientSummaryFixture();

        const {
          journey,
        } =
          buildJourney(
            patient
          );

        expect(
          journey.latestReport
        ).toBeNull();

        expect(
          journey.latestIntelligence
        ).toBeNull();

        expect(
          journey.latestHistoryItem
        ).toBeNull();

        expect(
          journey.lastMeaningfulUpdate
        ).toBeNull();

        expect(
          journey.lastUpdated
        ).toBeNull();
      }
    );
  }
);