import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildClinicalComparisonResponse,
} from "@/lib/health-intelligence/application/assistant-response/clinical-comparison-response";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

describe(
  "clinical comparison response",
  () => {
    it(
      "includes objective marker changes when structured text fields did not change",
      () => {
        const healthContext =
          {
            clinicalContext: {
              comparison: {
                latest:
                  null,

                previous:
                  null,

                hasComparison:
                  true,

                comparisonReady:
                  false,

                missingInformation:
                  [],
              },

              evidence: {
                status:
                  "insufficient",

                latestReportId:
                  702,

                previousReportId:
                  701,

                latestReportDate:
                  "2026-08-20T08:00:00.000Z",

                previousReportDate:
                  "2026-06-20T08:00:00.000Z",

                fields:
                  [],

                markerComparisons: [
                  {
                    marker:
                      "LDL",

                    unit:
                      "mg/dL",

                    previousValue:
                      174,

                    latestValue:
                      132,

                    delta:
                      -42,

                    changed:
                      true,

                    previousStatus:
                      "High",

                    latestStatus:
                      "High",

                    statusChanged:
                      false,

                    previousReferenceLow:
                      0,

                    previousReferenceHigh:
                      100,

                    latestReferenceLow:
                      0,

                    latestReferenceHigh:
                      100,

                    previousReferenceSource:
                      "default",

                    latestReferenceSource:
                      "default",
                  },
                ],

                comparableFieldCount:
                  0,

                changedFieldCount:
                  0,

                unchangedFieldCount:
                  0,

                missingFields:
                  [],

                limitations:
                  [],
              },

              markerTrends: [
                {
                  marker:
                    "LDL",

                  unit:
                    "mg/dL",

                  previousValue:
                    174,

                  latestValue:
                    132,

                  delta:
                    -42,

                  previousStatus:
                    "High",

                  latestStatus:
                    "High",

                  interpretation:
                    "persistent_abnormal_numeric_change",

                  canConfirmClinicalDirection:
                    false,
                },
              ],

              reasoning: {
                state:
                  "verified_changes",

                comparisonReady:
                  false,

                confidence:
                  "low",

                significantChanges:
                  [],

                stableAreas:
                  [],

                objectiveMarkerChanges: [
                  {
                    marker:
                      "LDL",

                    unit:
                      "mg/dL",

                    previousValue:
                      174,

                    latestValue:
                      132,

                    delta:
                      -42,
                  },
                ],

                insufficientEvidence:
                  [],

                verifiedChangeCount:
                  0,

                objectiveMarkerChangeCount:
                  1,

                stableFieldCount:
                  0,

                comparableFieldCount:
                  0,

                canConfirmDirection:
                  false,

                direction:
                  null,

                limitations: [
                  "Objective marker values changed across comparable reports, but the numeric change alone does not establish clinical improvement or deterioration.",
                ],
              },

              direction: {
                direction:
                  "inconclusive",

                confidence:
                  "low",

                supportingSignals:
                  [],

                contradictingSignals:
                  [],

                previousRiskLevel:
                  null,

                latestRiskLevel:
                  null,

                comparableReportType:
                  false,

                canConfirmClinicalDirection:
                  false,

                limitations:
                  [],
              },
            },
          } as AssistantResponseHealthContext;

        const response =
          buildClinicalComparisonResponse({
            language:
              "en",

            healthContext,
          });

        expect(
          response
        ).toContain(
          "LDL"
        );

        expect(
          response
        ).toContain(
          "174 mg/dL"
        );

        expect(
          response
        ).toContain(
          "132 mg/dL"
        );

        expect(
          response
        ).toContain(
          "does not establish clinical improvement or deterioration"
        );
      }
    );
  }
);