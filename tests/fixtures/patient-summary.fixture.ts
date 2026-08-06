import type {
  PatientSummary,
} from "@/lib/models/patient";

export type PatientSummaryFixtureOverrides =
  Partial<PatientSummary>;

export type AssessmentFixtureOverrides =
  Partial<
    PatientSummary["assessments"][number]
  >;

export type CheckInFixtureOverrides =
  Partial<
    NonNullable<
      PatientSummary["latestCheckIn"]
    >
  >;

export type UploadedReportFixtureOverrides =
  Partial<
    PatientSummary["uploadedReports"][number]
  >;

export type HealthInsightFixtureOverrides =
  Partial<
    PatientSummary["healthInsights"][number]
  >;

export type GeneratedResultFixtureOverrides =
  Partial<
    PatientSummary["generatedResults"][number]
  >;

export function createAssessmentFixture(
  overrides:
    AssessmentFixtureOverrides = {}
): PatientSummary["assessments"][number] {
  return {
    organ_name:
      "Heart",

    score:
      75,

    risk_level:
      "Stable",

    notes:
      "Stable organ assessment.",

    created_at:
      "2026-08-01T08:00:00.000Z",

    ...overrides,
  };
}

export function createCheckInFixture(
  overrides:
    CheckInFixtureOverrides = {}
): NonNullable<
  PatientSummary["latestCheckIn"]
> {
  return {
    mood:
      "Good",

    wellness_score:
      75,

    created_at:
      "2026-08-02T08:00:00.000Z",

    ...overrides,
  };
}

export function createUploadedReportFixture(
  overrides:
    UploadedReportFixtureOverrides = {}
): PatientSummary["uploadedReports"][number] {
  return {
    id:
      1,

    file_name:
      "medical-report.pdf",

    file_path:
      "test-user/medical-report.pdf",

    report_type:
      "lab",

    extraction_status:
      "Completed",

    extracted_text:
      "Readable medical report text for health intelligence testing.",

    created_at:
      "2026-08-03T08:00:00.000Z",

    extracted_at:
      "2026-08-03T08:05:00.000Z",

    ...overrides,
  };
}

export function createHealthInsightFixture(
  overrides:
    HealthInsightFixtureOverrides = {}
): PatientSummary["healthInsights"][number] {
  return {
    id:
      1,

    report_id:
      1,

    insight_title:
      "Connected health analysis",

    summary:
      "The report was analyzed and connected with the current health context.",

    key_findings:
      "No critical findings were identified.",

    recommendations:
      "Continue routine health follow-up.",

    doctor_brief:
      "Stable health context with routine follow-up recommended.",

    ai_status:
      "Generated",

    risk_level:
      "Stable",

    next_best_action:
      "Continue the current health plan.",

    report_type:
      "lab",

    created_at:
      "2026-08-03T09:00:00.000Z",

    ...overrides,
  };
}

export function createGeneratedResultFixture(
  overrides:
    GeneratedResultFixtureOverrides = {}
): PatientSummary["generatedResults"][number] {
  return {
    insight_id:
      1,

    report_id:
      1,

    updated_at:
      "2026-08-03T09:05:00.000Z",

    ...overrides,
  };
}

export function createPatientSummaryFixture(
  overrides:
    PatientSummaryFixtureOverrides = {}
): PatientSummary {
  const baseFixture:
    PatientSummary = {
      profile:
        null,

      assessments:
        [],

      latestCheckIn:
        null,

      recentCheckIns:
        [],

      uploadedReports:
        [],

      healthInsights:
        [],

      generatedResults:
        [],

      historyItems:
        [],
    };

  return {
    ...baseFixture,
    ...overrides,

    assessments:
      overrides.assessments
        ? [...overrides.assessments]
        : [...baseFixture.assessments],

    recentCheckIns:
      overrides.recentCheckIns
        ? [...overrides.recentCheckIns]
        : [...baseFixture.recentCheckIns],

    uploadedReports:
      overrides.uploadedReports
        ? [...overrides.uploadedReports]
        : [...baseFixture.uploadedReports],

    healthInsights:
      overrides.healthInsights
        ? [...overrides.healthInsights]
        : [...baseFixture.healthInsights],

    generatedResults:
      overrides.generatedResults
        ? [...overrides.generatedResults]
        : [...baseFixture.generatedResults],

    historyItems:
      overrides.historyItems
        ? [...overrides.historyItems]
        : [...baseFixture.historyItems],
  };
}