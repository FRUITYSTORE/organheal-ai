import type {
  PatientSummary,
} from "@/lib/models/patient";

export type PatientSummaryFixtureOverrides =
  Partial<PatientSummary>;

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