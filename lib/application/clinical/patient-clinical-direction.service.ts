import type {
  PatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

import type {
  PatientClinicalReasoning,
} from "@/lib/application/clinical/patient-clinical-reasoning.service";

export type PatientClinicalDirection =
  | "possible_improvement"
  | "possible_worsening"
  | "stable"
  | "inconclusive";

export type PatientClinicalDirectionConfidence =
  | "low"
  | "moderate";

export type PatientClinicalDirectionSignalCode =
  | "risk_level_decreased"
  | "risk_level_increased"
  | "risk_level_unchanged"
  | "report_type_changed"
  | "risk_level_missing"
  | "unsupported_risk_level"
  | "structured_fields_changed"
  | "structured_fields_stable";

export type PatientClinicalDirectionSignal = {
  code:
    PatientClinicalDirectionSignalCode;

  field:
    | "risk_level"
    | "report_type"
    | "structured_fields";

  previousValue:
    | string
    | null;

  latestValue:
    | string
    | null;
};

export type PatientClinicalDirectionAssessment = {
  direction:
    PatientClinicalDirection;

  confidence:
    PatientClinicalDirectionConfidence;

  supportingSignals:
    PatientClinicalDirectionSignal[];

  contradictingSignals:
    PatientClinicalDirectionSignal[];

  previousRiskLevel:
    | string
    | null;

  latestRiskLevel:
    | string
    | null;

  comparableReportType:
    boolean;

  canConfirmClinicalDirection:
    false;

  limitations:
    string[];
};

export type BuildPatientClinicalDirectionInput = {
  evidence:
    PatientClinicalComparisonEvidence;

  reasoning:
    PatientClinicalReasoning;
};

type NormalizedRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "critical";

const RISK_LEVEL_RANK:
  Record<
    NormalizedRiskLevel,
    number
  > = {
    low:
      1,

    moderate:
      2,

    high:
      3,

    critical:
      4,
  };

function normalizeText(
  value:
    | string
    | null
    | undefined
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeRiskLevel(
  value:
    | string
    | null
    | undefined
): NormalizedRiskLevel | null {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized === "low" ||
    normalized.includes("low risk")
  ) {
    return "low";
  }

  if (
    normalized === "moderate" ||
    normalized === "medium" ||
    normalized.includes(
      "moderate risk"
    ) ||
    normalized.includes(
      "medium risk"
    )
  ) {
    return "moderate";
  }

  if (
    normalized === "high" ||
    normalized.includes("high risk")
  ) {
    return "high";
  }

  if (
    normalized === "critical" ||
    normalized === "severe" ||
    normalized.includes(
      "critical risk"
    ) ||
    normalized.includes(
      "severe risk"
    )
  ) {
    return "critical";
  }

  return null;
}

function getFieldEvidence(
  evidence:
    PatientClinicalComparisonEvidence,
  field:
    | "risk_level"
    | "report_type"
) {
  return (
    evidence.fields.find(
      (item) =>
        item.field === field
    ) ??
    null
  );
}

export function buildPatientClinicalDirection({
  evidence,
  reasoning,
}: BuildPatientClinicalDirectionInput): PatientClinicalDirectionAssessment {
  const riskEvidence =
    getFieldEvidence(
      evidence,
      "risk_level"
    );

  const reportTypeEvidence =
    getFieldEvidence(
      evidence,
      "report_type"
    );

  const previousRiskLevel =
    riskEvidence?.previousValue ??
    null;

  const latestRiskLevel =
    riskEvidence?.latestValue ??
    null;

  const normalizedPreviousRisk =
    normalizeRiskLevel(
      previousRiskLevel
    );

  const normalizedLatestRisk =
    normalizeRiskLevel(
      latestRiskLevel
    );

  const normalizedPreviousReportType =
    normalizeText(
      reportTypeEvidence
        ?.previousValue
    );

  const normalizedLatestReportType =
    normalizeText(
      reportTypeEvidence
        ?.latestValue
    );

  const comparableReportType =
    normalizedPreviousReportType !==
      null &&
    normalizedLatestReportType !==
      null &&
    normalizedPreviousReportType ===
      normalizedLatestReportType;

  const supportingSignals:
    PatientClinicalDirectionSignal[] = [];

  const contradictingSignals:
    PatientClinicalDirectionSignal[] = [];

  const limitations = [
    ...reasoning.limitations,
  ];

  if (
    !comparableReportType
  ) {
    contradictingSignals.push({
      code:
        "report_type_changed",

      field:
        "report_type",

      previousValue:
        reportTypeEvidence
          ?.previousValue ??
        null,

      latestValue:
        reportTypeEvidence
          ?.latestValue ??
        null,
    });

    limitations.push(
      "The latest two reports do not have the same normalized report type, so directional interpretation is limited."
    );
  }

  if (
    !previousRiskLevel ||
    !latestRiskLevel
  ) {
    contradictingSignals.push({
      code:
        "risk_level_missing",

      field:
        "risk_level",

      previousValue:
        previousRiskLevel,

      latestValue:
        latestRiskLevel,
    });

    limitations.push(
      "A comparable risk level is missing from one or both reports."
    );
  } else if (
    !normalizedPreviousRisk ||
    !normalizedLatestRisk
  ) {
    contradictingSignals.push({
      code:
        "unsupported_risk_level",

      field:
        "risk_level",

      previousValue:
        previousRiskLevel,

      latestValue:
        latestRiskLevel,
    });

    limitations.push(
      "One or both risk levels could not be mapped to the supported low, moderate, high, or critical scale."
    );
  }

  if (
    reasoning.verifiedChangeCount >
    0
  ) {
    supportingSignals.push({
      code:
        "structured_fields_changed",

      field:
        "structured_fields",

      previousValue:
        String(
          reasoning.stableFieldCount
        ),

      latestValue:
        String(
          reasoning.verifiedChangeCount
        ),
    });
  } else if (
    reasoning.comparableFieldCount >
    0
  ) {
    supportingSignals.push({
      code:
        "structured_fields_stable",

      field:
        "structured_fields",

      previousValue:
        String(
          reasoning.comparableFieldCount
        ),

      latestValue:
        String(
          reasoning.comparableFieldCount
        ),
    });
  }

  let direction:
    PatientClinicalDirection =
      "inconclusive";

  if (
    comparableReportType &&
    normalizedPreviousRisk &&
    normalizedLatestRisk
  ) {
    const previousRank =
      RISK_LEVEL_RANK[
        normalizedPreviousRisk
      ];

    const latestRank =
      RISK_LEVEL_RANK[
        normalizedLatestRisk
      ];

    if (
      latestRank <
      previousRank
    ) {
      direction =
        "possible_improvement";

      supportingSignals.push({
        code:
          "risk_level_decreased",

        field:
          "risk_level",

        previousValue:
          previousRiskLevel,

        latestValue:
          latestRiskLevel,
      });
    } else if (
      latestRank >
      previousRank
    ) {
      direction =
        "possible_worsening";

      supportingSignals.push({
        code:
          "risk_level_increased",

        field:
          "risk_level",

        previousValue:
          previousRiskLevel,

        latestValue:
          latestRiskLevel,
      });
    } else {
      direction =
        "stable";

      supportingSignals.push({
        code:
          "risk_level_unchanged",

        field:
          "risk_level",

        previousValue:
          previousRiskLevel,

        latestValue:
          latestRiskLevel,
      });
    }
  }

  limitations.push(
    "Risk-level movement is only a directional signal and does not confirm clinical improvement, deterioration, or diagnosis."
  );

  limitations.push(
    "Differences in report source, laboratory method, clinical context, treatment, and reporting language may affect the comparison."
  );

  return {
    direction,

    confidence:
      direction ===
        "inconclusive"
        ? "low"
        : "moderate",

    supportingSignals,

    contradictingSignals,

    previousRiskLevel,

    latestRiskLevel,

    comparableReportType,

    canConfirmClinicalDirection:
      false,

    limitations:
      Array.from(
        new Set(
          limitations
        )
      ),
  };
}