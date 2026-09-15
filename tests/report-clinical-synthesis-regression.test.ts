import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildLabMarkerSummary,
  type LabMarkerResult,
} from "@/lib/labMarkerDetector";

import {
  detectClinicalPatterns,
} from "@/lib/clinicalPatternEngine";

import {
  buildHealthInsightUpdate,
} from "@/lib/services/intelligence/intelligence-persistence.service";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

describe(
  "report clinical synthesis regression",
  () => {
    const markers:
      LabMarkerResult[] = [
        {
          marker: "LDL",
          value: 170,
          unit: "mg/dL",
          status: "High",
          note: "Above range",
          category: "Lipids",
          referenceLow: 0,
          referenceHigh: 100,
          referenceSource:
            "default",
        },

        {
          marker:
            "Triglycerides",
          value: 220,
          unit: "mg/dL",
          status: "High",
          note: "Above range",
          category: "Lipids",
          referenceLow: 0,
          referenceHigh: 150,
          referenceSource:
            "default",
        },

        {
          marker: "HDL",
          value: 35,
          unit: "mg/dL",
          status: "Low",
          note: "Below range",
          category: "Lipids",
          referenceLow: 40,
          referenceHigh: 999,
          referenceSource:
            "default",
        },

        {
          marker: "Glucose",
          value: 90,
          unit: "mg/dL",
          status: "Normal",
          note: "Within range",
          category: "Metabolic",
          referenceLow: 70,
          referenceHigh: 126,
          referenceSource:
            "default",
        },

        {
          marker: "Creatinine",
          value: 0.9,
          unit: "mg/dL",
          status: "Normal",
          note: "Within range",
          category: "Kidney",
          referenceLow: 0.6,
          referenceHigh: 1.3,
          referenceSource:
            "default",
        },
      ];

    it(
      "separates abnormal findings from reassuring findings",
      () => {
        const result =
          buildLabMarkerSummary(
            markers,
            "en"
          );

        expect(
          result.summary
        ).toContain(
          "3 of 5"
        );

        expect(
          result.keyFindings
        ).toContain(
          "Abnormal findings:"
        );

        expect(
          result.keyFindings
        ).toContain(
          "LDL: 170 mg/dL"
        );

        expect(
          result.keyFindings
        ).toContain(
          "Reassuring findings"
        );

        expect(
          result.keyFindings
        ).toContain(
          "Creatinine: 0.9 mg/dL"
        );
      }
    );

    it(
      "turns clinical patterns into prioritized patient-facing reasoning",
      () => {
        const markerSummary =
          buildLabMarkerSummary(
            markers,
            "en"
          );

        const clinicalPatterns =
          detectClinicalPatterns(
            markers
          );

        const result =
          buildHealthInsightUpdate({
            extractedText:
              "LDL 170 mg/dL, triglycerides 220 mg/dL, HDL 35 mg/dL, glucose 90 mg/dL, creatinine 0.9 mg/dL.",

            reportType:
              "lab",

            markerSummary,

            radiologySummary: {
              summary: "",
              riskSignals: "",
              recommendations: "",
            },

            isRadiologyReport:
              false,

            clinicalPatterns,

            unifiedHealth: {
              healthForecast:
                "Requires follow-up",

              priorityGoal:
                "Review lipid risk",

              nextBestAction:
                "Review lipid results with a clinician",
            },

            language:
              "en",
          });

        expect(
          result.risk_signals
        ).toContain(
          "Top priority:"
        );

        expect(
          result.risk_signals
        ).toContain(
          "Cardiometabolic Risk Pattern"
        );

        expect(
          result.risk_signals
        ).toContain(
          "Why it matters:"
        );

        expect(
          result.risk_signals
        ).toContain(
          "Evidence:"
        );

        expect(
          result.recommendations
        ).toContain(
          "Follow-up timing:"
        );

        expect(
          result.recommendations
        ).toContain(
          "Earlier review:"
        );

        expect(
          result.recommendations
        ).toContain(
          "Limitations:"
        );
      }
    );

    it(
      "prefers report-specific evidence over generic patient presentation in the patient report",
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              "app/intelligence/components/PatientReportPdfCard.tsx"
            ),
            "utf8"
          );

        expect(
          source
        ).toMatch(
          /summary\s*\?\?\s*patientPresentation\s*\?\.\s*whatThisMeans/
        );

        expect(
          source
        ).toMatch(
          /keyFindings\s*\?\?\s*patientPresentation\s*\?\.\s*mainThingsNoticed/
        );

        expect(
          source
        ).toMatch(
          /riskSignals\s*\?\?\s*patientPresentation\s*\?\.\s*whatNeedsAttention/
        );

        expect(
          source
        ).toMatch(
          /recommendations\s*\?\?\s*patientPresentation\s*\?\.\s*helpfulNextSteps/
        );
      }
    );
  }
);