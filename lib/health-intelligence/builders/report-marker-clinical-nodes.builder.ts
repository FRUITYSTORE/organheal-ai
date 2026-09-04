import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  ReportMedicalMarkerEvidence,
} from "@/lib/repositories/report-markers.repository";

import type {
  ClinicalEvidenceConfidence,
  ClinicalEvidenceReference,
  ClinicalPriority,
  WholeBodyClinicalNode,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

function normalizeMarkerName(
  markerName: string
): string {
  return markerName
    .trim()
    .toLocaleLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function markerMatches(
  normalizedMarkerName: string,
  aliases: string[]
): boolean {
  return aliases.some(
    (alias) =>
      normalizedMarkerName === alias ||
      normalizedMarkerName.includes(
        alias
      )
  );
}

function resolveMarkerDomains(
  markerName: string
): WholeBodyHealthDomain[] {
  const normalized =
    normalizeMarkerName(
      markerName
    );

  if (
    markerMatches(
      normalized,
      [
        "glucose",
        "hba1c",
        "a1c",
        "insulin",
      ]
    )
  ) {
    return [
      "endocrine-metabolic",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "cholesterol",
        "ldl",
        "hdl",
        "triglyceride",
      ]
    )
  ) {
    return [
      "cardiovascular",
      "endocrine-metabolic",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "alt",
        "ast",
        "alp",
        "bilirubin",
        "albumin",
      ]
    )
  ) {
    return [
      "hepatic-biliary",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "creatinine",
        "bun",
        "egfr",
        "urea",
      ]
    )
  ) {
    return [
      "renal-urinary",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "hemoglobin",
        "haemoglobin",
        "wbc",
        "platelet",
        "hematocrit",
        "haematocrit",
      ]
    )
  ) {
    return [
      "hematological",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "tsh",
        "thyroid",
        "free t4",
        "free t3",
      ]
    )
  ) {
    return [
      "endocrine-metabolic",
    ];
  }

  if (
    markerMatches(
      normalized,
      [
        "vitamin d",
      ]
    )
  ) {
    return [
      "nutrition",
      "musculoskeletal",
    ];
  }

  return [
    "general-systemic",
  ];
}

function resolveMarkerPriority(
  marker:
    ReportMedicalMarkerEvidence
): ClinicalPriority {
  if (
    marker.marker_status === "High" ||
    marker.marker_status === "Low" ||
    marker.marker_status === "Detected"
  ) {
    return "important";
  }

  if (
    marker.marker_status === "Normal"
  ) {
    return "routine";
  }

  return "monitor";
}

function resolveMarkerConfidence(
  marker:
    ReportMedicalMarkerEvidence
): ClinicalEvidenceConfidence {
  if (
    marker.reference_source ===
    "report"
  ) {
    return "high";
  }

  return "moderate";
}

function formatMarkerValue(
  marker:
    ReportMedicalMarkerEvidence
): string {
  return [
    marker.marker_value,
    marker.marker_unit,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== ""
    )
    .join(" ");
}

function formatReferenceRange(
  marker:
    ReportMedicalMarkerEvidence
): string | null {
  if (
    marker.reference_low !== null &&
    marker.reference_high !== null
  ) {
    return [
      marker.reference_low,
      marker.reference_high,
    ].join("-");
  }

  if (
    marker.reference_low !== null
  ) {
    return `>= ${marker.reference_low}`;
  }

  if (
    marker.reference_high !== null
  ) {
    return `<= ${marker.reference_high}`;
  }

  return null;
}

function buildMarkerDescription(
  marker:
    ReportMedicalMarkerEvidence
): string {
  const value =
    formatMarkerValue(
      marker
    );

  const status =
    marker.marker_status
      ? ` Status: ${marker.marker_status}.`
      : "";

  const referenceRange =
    formatReferenceRange(
      marker
    );

  const reference =
    referenceRange
      ? ` Available reference range: ${referenceRange}${
          marker.marker_unit
            ? ` ${marker.marker_unit}`
            : ""
        }${
          marker.reference_source
            ? ` (${marker.reference_source})`
            : ""
        }.`
      : "";

  return `Reported ${marker.marker_name} result: ${value}.${status}${reference}`;
}

function createMarkerNode(
  marker:
    ReportMedicalMarkerEvidence,
  index:
    number
): WholeBodyClinicalNode {
  const normalizedName =
    normalizeMarkerName(
      marker.marker_name
    );

  const markerKey =
    normalizedName.replace(
      /\s+/g,
      "-"
    ) || "marker";

  const evidenceId = [
    "evidence",
    "laboratory-result",
    marker.report_id,
    markerKey,
    index,
  ].join(":");

  const confidence =
    resolveMarkerConfidence(
      marker
    );

  const evidence:
    ClinicalEvidenceReference = {
      id:
        evidenceId,

      sourceType:
        "laboratory-result",

      sourceId:
        String(
          marker.report_id
        ),

      label:
        marker.marker_name,

      value:
        marker.marker_value,

      unit:
        marker.marker_unit,

      observedAt:
        marker.created_at,

      certainty:
        "reported",

      confidence,

      relevance:
        marker.marker_status === "Normal"
          ? "contextual"
          : "supporting",
    };

  return {
    id:
      `node:report-marker:${marker.report_id}:${markerKey}:${index}`,

    type:
      "laboratory-marker",

    label:
      marker.marker_name,

    description:
      buildMarkerDescription(
        marker
      ),

    domains:
      resolveMarkerDomains(
        marker.marker_name
      ),

    evidence: [
      evidence,
    ],

    priority:
      resolveMarkerPriority(
        marker
      ),

    confidence,
  };
}

export function buildReportMarkerClinicalNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient.reportMarkers.map(
    createMarkerNode
  );
}