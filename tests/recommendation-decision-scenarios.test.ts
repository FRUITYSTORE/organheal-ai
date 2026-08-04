import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildRecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  createPatientSummaryFixture,
} from "@/tests/fixtures/patient-summary.fixture";

const FIXED_NOW =
  new Date(
    "2026-08-04T12:00:00.000Z"
  );

function createAssessment():
  PatientSummary["assessments"][number] {
  return {
    organ_name:
      "Heart",

    score:
      72,

    risk_level:
      "Moderate",

    notes:
      null,

    created_at:
      "2026-08-01T08:00:00.000Z",
  };
}

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
  id:
    number
): PatientSummary["uploadedReports"][number] {
  return {
    id,

    file_name:
      `report-${id}.pdf`,

    file_path:
      `/reports/report-${id}.pdf`,

    report_type:
      "Laboratory",

    extraction_status:
      "Completed",

    extracted_text:
      "Structured report content.",

    created_at:
      `2026-08-0${id}T08:00:00.000Z`,

    extracted_at:
      `2026-08-0${id}T08:05:00.000Z`,
  };
}

function createInsight(
  id:
    number,
  reportId:
    number
): PatientSummary["healthInsights"][number] {
  return {
    id,

    report_id:
      reportId,

    insight_title:
      `Insight ${id}`,

    summary:
      "Report summary.",

    key_findings:
      "Report findings.",

    recommendations:
      "Follow the recommended plan.",

    doctor_brief:
      "Doctor brief.",

    ai_status:
      "Generated",

    risk_level:
      "Moderate",

    next_best_action:
      "Review the report findings.",

    report_type:
      "Laboratory",

    created_at:
      `2026-08-0${id}T09:00:00.000Z`,
  };
}

function createGeneratedResult(
  insightId:
    number,
  reportId:
    number
): PatientSummary["generatedResults"][number] {
  return {
    insight_id:
      insightId,

    report_id:
      reportId,

    updated_at:
      "2026-08-03T10:00:00.000Z",
  };
}

function createCriticalFinding():
  ClinicalFinding {
  return {
    id:
      "critical-finding",

    severity:
      "critical",

    title:
      "Critical health signal",

    description:
      "A critical finding requires prompt clinical review.",

    source:
      "report",
  };
}

describe(
  "recommendation decision scenario matrix",
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
      "selects missing assessment when no health data exists",
      () => {
        const patient =
          createPatientSummaryFixture();

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "data",

          reason:
            "missing_assessment",
        });
      }
    );

    it(
      "selects missing report when an assessment exists without reports",
      () => {
        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "data",

          reason:
            "missing_report",
        });
      }
    );

    it(
      "selects report analysis needed when a report exists without generated analysis",
      () => {
        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            uploadedReports: [
              createReport(
                1
              ),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "data",

          reason:
            "report_analysis_needed",
        });
      }
    );

    it(
      "selects follow-up needed when core data exists and the latest Check-In is overdue",
      () => {
        const overdueCheckIn =
          createCheckIn(
            "2026-07-20T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            latestCheckIn:
              overdueCheckIn,

            recentCheckIns: [
              overdueCheckIn,
            ],

            uploadedReports: [
              createReport(
                1
              ),
            ],

            healthInsights: [
              createInsight(
                1,
                1
              ),
            ],

            generatedResults: [
              createGeneratedResult(
                1,
                1
              ),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "journey",

          reason:
            "follow_up_needed",
        });
      }
    );

    it(
      "selects lifestyle when core data exists and the latest Check-In is recent",
      () => {
        const recentCheckIn =
          createCheckIn(
            "2026-08-02T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            latestCheckIn:
              recentCheckIn,

            recentCheckIns: [
              recentCheckIn,
            ],

            uploadedReports: [
              createReport(
                1
              ),
            ],

            healthInsights: [
              createInsight(
                1,
                1
              ),
            ],

            generatedResults: [
              createGeneratedResult(
                1,
                1
              ),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "lifestyle",

          reason:
            "core_data_available",
        });
      }
    );

    it(
      "selects clinical when two distinct reports have longitudinal insights",
      () => {
        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            uploadedReports: [
              createReport(
                1
              ),
              createReport(
                2
              ),
            ],

            healthInsights: [
              createInsight(
                1,
                1
              ),
              createInsight(
                2,
                2
              ),
            ],

            generatedResults: [
              createGeneratedResult(
                1,
                1
              ),
              createGeneratedResult(
                2,
                2
              ),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "clinical",

          reason:
            "longitudinal_reports_available",
        });
      }
    );

    it(
      "prioritizes emergency over missing data when a critical finding exists",
      () => {
        const patient =
          createPatientSummaryFixture();

        const decision =
          buildRecommendationDecision({
            patient,

            findings: [
              createCriticalFinding(),
            ],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "emergency",

          reason:
            "critical_finding_present",
        });
      }
    );

    it(
      "prioritizes clinical over overdue journey follow-up",
      () => {
        const overdueCheckIn =
          createCheckIn(
            "2026-07-20T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            latestCheckIn:
              overdueCheckIn,

            recentCheckIns: [
              overdueCheckIn,
            ],

            uploadedReports: [
              createReport(
                1
              ),
              createReport(
                2
              ),
            ],

            healthInsights: [
              createInsight(
                1,
                1
              ),
              createInsight(
                2,
                2
              ),
            ],

            generatedResults: [
              createGeneratedResult(
                1,
                1
              ),
              createGeneratedResult(
                2,
                2
              ),
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "clinical",

          reason:
            "longitudinal_reports_available",
        });
      }
    );

    it(
      "prioritizes missing data over journey follow-up",
      () => {
        const overdueCheckIn =
          createCheckIn(
            "2026-07-20T12:00:00.000Z"
          );

        const patient =
          createPatientSummaryFixture({
            latestCheckIn:
              overdueCheckIn,

            recentCheckIns: [
              overdueCheckIn,
            ],
          });

        const decision =
          buildRecommendationDecision({
            patient,

            findings:
              [],
          });

        expect(
          decision
        ).toEqual({
          layer:
            "data",

          reason:
            "missing_assessment",
        });
      }
    );
  }
);