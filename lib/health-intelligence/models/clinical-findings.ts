import type {
  LabMarkerStatus,
} from "@/lib/labMarkerDetector";

export type ClinicalFindingSeverity =
  | "info"
  | "warning"
  | "critical";

export type ClinicalFindingSource =
  | "assessment"
  | "checkin"
  | "report"
  | "intelligence";

export type ClinicalFindingReportEvidence = {
  reportId: number;
  markerName: string;
  markerValue: number;
  markerUnit: string | null;
  markerStatus: LabMarkerStatus | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceSource:
    | "report"
    | "default"
    | null;
  measuredAt: string;
};

export type ClinicalFinding = {
  id: string;
  severity: ClinicalFindingSeverity;
  title: string;
  description: string;
  source: ClinicalFindingSource;
  reportEvidence?:
    ClinicalFindingReportEvidence;
};