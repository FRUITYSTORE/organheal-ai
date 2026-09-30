import type { LabMarkerResult, LabMarkerStatus } from "@/lib/labMarkerDetector";

// Decides which organ a member's personal report video should SHOW, from
// the markers actually detected in their own report text (the same
// detectLabMarkers() the rest of the site uses) — never a fixed organ, never
// a guess. Each organ also carries which of its structures the report's
// out-of-range markers point to, so the diagram lights up something true
// about THIS report (see organ-hero-scene.ts).
//
// Pure and side-effect-free so it's directly unit-testable
// (tests/report-organ-focus.test.ts).

export type ReportOrgan = "heart" | "liver" | "kidney" | "thyroid" | "blood" | "pancreas";

/**
 * Structures a diagram can highlight. Which ones light up is decided only by
 * out-of-range markers from the report; a report whose values are all in
 * range still gets the organ, calm and unhighlighted.
 */
export type OrganStructure =
  | "coronaryArteries"
  | "liverCells"
  | "bileDucts"
  | "filters"
  | "thyroidGland"
  | "redCells"
  | "whiteCells"
  | "platelets"
  | "islets";

export type ReportMarker = {
  name: string;
  value: number;
  unit: string;
  status: LabMarkerStatus;
};

export type ReportOrganFocus = {
  organ: ReportOrgan;
  /** This organ's markers from the report, out-of-range first. */
  markers: ReportMarker[];
  highlighted: OrganStructure[];
};

// labMarkerDetector's own categories -> the organ that marker is read from.
// Vitamins has no single organ, so it never picks a diagram on its own.
const CATEGORY_ORGAN: Record<string, ReportOrgan | undefined> = {
  Lipids: "heart",
  Liver: "liver",
  Kidney: "kidney",
  Thyroid: "thyroid",
  "Blood Count": "blood",
  Iron: "blood",
  Metabolic: "pancreas",
};

// Which structure an out-of-range value of each marker concerns — the
// standard textbook mechanism, not a diagnosis:
// - ALT/AST are enzymes released from liver cells; ALP and bilirubin track
//   the bile ducts; albumin is made by liver cells.
// - Creatinine, urea/BUN and eGFR all reflect the kidneys' filters.
// - Cholesterol and triglycerides build up in the coronary artery walls.
// - Glucose/HbA1c are controlled by insulin from the pancreas's islets.
const MARKER_STRUCTURE: Record<string, OrganStructure> = {
  "Total Cholesterol": "coronaryArteries",
  LDL: "coronaryArteries",
  HDL: "coronaryArteries",
  Triglycerides: "coronaryArteries",
  ALT: "liverCells",
  AST: "liverCells",
  Albumin: "liverCells",
  ALP: "bileDucts",
  Bilirubin: "bileDucts",
  Creatinine: "filters",
  Urea: "filters",
  BUN: "filters",
  eGFR: "filters",
  TSH: "thyroidGland",
  FT4: "thyroidGland",
  Hemoglobin: "redCells",
  RBC: "redCells",
  Ferritin: "redCells",
  WBC: "whiteCells",
  Platelets: "platelets",
  Glucose: "islets",
  HbA1c: "islets",
};

export const MAX_ORGANS_PER_VIDEO = 2;

function isOutOfRange(status: LabMarkerStatus): boolean {
  return status === "High" || status === "Low";
}

/**
 * The organs this report is about, most relevant first: organs with more
 * out-of-range markers first, then organs with more markers overall. At most
 * MAX_ORGANS_PER_VIDEO, and only an organ with at least one out-of-range
 * marker earns the second slot. Empty when the report has no marker that
 * belongs to an organ — the caller then shows no diagram rather than a
 * made-up one.
 */
export function deriveReportOrganFocus(markers: LabMarkerResult[]): ReportOrganFocus[] {
  const byOrgan = new Map<ReportOrgan, ReportMarker[]>();

  for (const marker of markers) {
    const organ = CATEGORY_ORGAN[marker.category];

    if (!organ || marker.value === null) {
      continue;
    }

    const list = byOrgan.get(organ) ?? [];
    list.push({ name: marker.marker, value: marker.value, unit: marker.unit, status: marker.status });
    byOrgan.set(organ, list);
  }

  const focuses = [...byOrgan.entries()].map(([organ, organMarkers]) => {
    const sorted = [...organMarkers].sort(
      (a, b) => Number(isOutOfRange(b.status)) - Number(isOutOfRange(a.status))
    );
    const highlighted = [
      ...new Set(
        sorted
          .filter((marker) => isOutOfRange(marker.status))
          .map((marker) => MARKER_STRUCTURE[marker.name])
          .filter((structure): structure is OrganStructure => Boolean(structure))
      ),
    ];

    return { organ, markers: sorted, highlighted };
  });

  const outOfRangeCount = (focus: ReportOrganFocus) =>
    focus.markers.filter((marker) => isOutOfRange(marker.status)).length;

  focuses.sort(
    (a, b) => outOfRangeCount(b) - outOfRangeCount(a) || b.markers.length - a.markers.length
  );

  return focuses.filter((focus, index) => index === 0 || outOfRangeCount(focus) > 0).slice(0, MAX_ORGANS_PER_VIDEO);
}
