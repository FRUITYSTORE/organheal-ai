export type ClinicalFindingSeverity =
  | "info"
  | "warning"
  | "critical";

export type ClinicalFindingSource =
  | "assessment"
  | "checkin"
  | "report"
  | "intelligence";

export type ClinicalFinding = {
  id: string;
  severity: ClinicalFindingSeverity;
  title: string;
  description: string;
  source: ClinicalFindingSource;
};