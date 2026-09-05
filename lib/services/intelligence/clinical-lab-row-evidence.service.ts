import {
  normalizeClinicalLabMarkerName,
} from "@/lib/clinical-lab-marker-normalizer";

import {
  parseClinicalLabReportRows,
  type ClinicalLabReportRow,
} from "@/lib/clinical-lab-report-row-parser";

import type {
  LabMarkerStatus,
} from "@/lib/labMarkerDetector";

export type ClinicalLabRowEvidence = {
  markerName: string;
  rawMarkerName: string;
  markerValue: number;
  markerUnit: string | null;
  markerStatus: LabMarkerStatus;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceSource:
    | "report"
    | null;
  normalizationConfidence:
    | "high"
    | "medium"
    | "low";
};

function normalizeFlag(
  flag: string | null
): string | null {
  return (
    flag
      ?.trim()
      .toUpperCase() ??
    null
  );
}

function resolveStatus(
  row: ClinicalLabReportRow
): LabMarkerStatus {
  const flag =
    normalizeFlag(
      row.flag
    );

  if (
    flag === "H" ||
    flag === "HIGH"
  ) {
    return "High";
  }

  if (
    flag === "L" ||
    flag === "LOW"
  ) {
    return "Low";
  }

  if (
    flag === "N" ||
    flag === "NORMAL"
  ) {
    return "Normal";
  }

  if (
    row.referenceLow !==
      null &&
    row.referenceHigh !==
      null
  ) {
    if (
      row.value <
      row.referenceLow
    ) {
      return "Low";
    }

    if (
      row.value >
      row.referenceHigh
    ) {
      return "High";
    }

    return "Normal";
  }

  return "Detected";
}

export function buildClinicalLabRowEvidence(
  extractedText: string
): ClinicalLabRowEvidence[] {
  const rows =
    parseClinicalLabReportRows(
      extractedText
    );

  return rows.map(
    (row) => {
      const normalized =
        normalizeClinicalLabMarkerName(
          row.rawName
        );

      return {
        markerName:
          normalized
            .canonicalName,

        rawMarkerName:
          normalized
            .rawName,

        markerValue:
          row.value,

        markerUnit:
          row.unit,

        markerStatus:
          resolveStatus(
            row
          ),

        referenceLow:
          row.referenceLow,

        referenceHigh:
          row.referenceHigh,

        referenceSource:
          row.referenceLow !==
              null &&
            row.referenceHigh !==
              null
            ? "report"
            : null,

        normalizationConfidence:
          normalized
            .confidence,
      };
    }
  );
}