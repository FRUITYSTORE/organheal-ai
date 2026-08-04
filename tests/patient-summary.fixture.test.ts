import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  createPatientSummaryFixture,
} from "@/tests/fixtures/patient-summary.fixture";

describe(
  "createPatientSummaryFixture",
  () => {
    it(
      "creates an empty patient summary by default",
      () => {
        const patient =
          createPatientSummaryFixture();

        expect(
          patient.profile
        ).toBeNull();

        expect(
          patient.latestCheckIn
        ).toBeNull();

        expect(
          patient.assessments
        ).toEqual([]);

        expect(
          patient.uploadedReports
        ).toEqual([]);

        expect(
          patient.generatedResults
        ).toEqual([]);
      }
    );

    it(
      "applies overrides without sharing array references",
      () => {
        const assessments:
          PatientSummary["assessments"] =
            [];

        const patient =
          createPatientSummaryFixture({
            assessments,
          });

        expect(
          patient.assessments
        ).not.toBe(
          assessments
        );

        expect(
          patient.assessments
        ).toEqual(
          assessments
        );
      }
    );
  }
);