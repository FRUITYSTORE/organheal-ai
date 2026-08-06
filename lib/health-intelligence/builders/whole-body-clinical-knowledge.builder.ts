import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  createEmptyWholeBodyClinicalKnowledgeModel,
  normalizeWholeBodyHealthDomain,
  type ClinicalEvidenceConfidence,
  type ClinicalEvidenceReference,
  type ClinicalPriority,
  type WholeBodyClinicalKnowledgeModel,
  type WholeBodyClinicalNode,
  type WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

import {
  buildWholeBodyClinicalRelationships,
} from "@/lib/health-intelligence/engines/whole-body-clinical-relationship.engine";

import {
  assessClinicalEvidenceSufficiency,
} from "@/lib/health-intelligence/engines/clinical-evidence-sufficiency.engine";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

function asRecord(
  value:
    unknown
): UnknownRecord {
  if (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  ) {
    return value as
      UnknownRecord;
  }

  return {};
}

function readString(
  record:
    UnknownRecord,
  keys:
    string[]
): string | null {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "string" &&
      value.trim()
        .length > 0
    ) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(
  record:
    UnknownRecord,
  keys:
    string[]
): number | null {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      return value;
    }
  }

  return null;
}

function readIdentifier(
  record:
    UnknownRecord,
  fallback:
    string
): string {
  const value =
    record.id;

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number"
  ) {
    return String(
      value
    );
  }

  return fallback;
}

function uniqueDomains(
  domains:
    WholeBodyHealthDomain[]
): WholeBodyHealthDomain[] {
  return [
    ...new Set(
      domains
    ),
  ];
}

function createEvidenceReference(
  input: {
    id:
      string;

    sourceType:
      ClinicalEvidenceReference["sourceType"];

    sourceId:
      string | null;

    label:
      string;

    value:
      string | number | boolean | null;

    observedAt:
      string | null;

    confidence?:
      ClinicalEvidenceConfidence;
  }
): ClinicalEvidenceReference {
  return {
    id:
      input.id,

    sourceType:
      input.sourceType,

    sourceId:
      input.sourceId,

    label:
      input.label,

    value:
      input.value,

    unit:
      null,

    observedAt:
      input.observedAt,

    certainty:
      "reported",

    confidence:
      input.confidence ??
      "moderate",

    relevance:
      "contextual",
  };
}

function createNode(
  input: {
    id:
      string;

    type:
      WholeBodyClinicalNode["type"];

    label:
      string;

    description:
      string | null;

    domains:
      WholeBodyHealthDomain[];

    evidence:
      ClinicalEvidenceReference[];

    priority?:
      ClinicalPriority;

    confidence?:
      ClinicalEvidenceConfidence;
  }
): WholeBodyClinicalNode {
  return {
    id:
      input.id,

    type:
      input.type,

    label:
      input.label,

    description:
      input.description,

    domains:
      uniqueDomains(
        input.domains
      ),

    evidence:
      input.evidence,

    priority:
      input.priority ??
      "routine",

    confidence:
      input.confidence ??
      "moderate",
  };
}

function buildAssessmentNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient
    .assessments
    .map(
      (
        assessment,
        index
      ) => {
        const record =
          asRecord(
            assessment
          );

        const sourceId =
          readIdentifier(
            record,
            `assessment-${index}`
          );

        const moduleName =
          readString(
            record,
            [
              "organ_name",
              "moduleName",
              "module_name",
              "organName",
            ]
          ) ??
          "General health assessment";

        const score =
          readNumber(
            record,
            [
              "score",
              "overall_score",
              "overallScore",
            ]
          );

        const observedAt =
          readString(
            record,
            [
              "created_at",
              "createdAt",
            ]
          );

        const domain =
          normalizeWholeBodyHealthDomain(
            moduleName
          );

        const evidence =
          createEvidenceReference({
            id:
              `evidence:assessment:${sourceId}`,

            sourceType:
              "assessment",

            sourceId,

            label:
              `${moduleName} assessment`,

            value:
              score,

            observedAt,

            confidence:
              "high",
          });

        return createNode({
          id:
            `node:assessment:${sourceId}`,

          type:
            "finding",

          label:
            `${moduleName} assessment`,

          description:
            score === null
              ? "A saved health assessment is available."
              : `Recorded assessment score: ${score}.`,

          domains: [
            domain,
          ],

          evidence: [
            evidence,
          ],

          priority:
            "monitor",

          confidence:
            "high",
        });
      }
    );
}

function buildCheckInNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient
    .recentCheckIns
    .map(
      (
        checkIn,
        index
      ) => {
        const record =
          asRecord(
            checkIn
          );

        const sourceId =
          readIdentifier(
            record,
            `check-in-${index}`
          );

        const observedAt =
          readString(
            record,
            [
              "created_at",
              "createdAt",
            ]
          );

        const wellnessScore =
          readNumber(
            record,
            [
              "wellness_score",
              "wellnessScore",
            ]
          );

        const mood =
          readString(
            record,
            [
              "mood",
            ]
          );

        const value =
          wellnessScore ??
          mood;

        const evidence =
          createEvidenceReference({
            id:
              `evidence:check-in:${sourceId}`,

            sourceType:
              "check-in",

            sourceId,

            label:
              "Health check-in",

            value,

            observedAt,
          });

        return createNode({
          id:
            `node:check-in:${sourceId}`,

          type:
            "health-behavior",

          label:
            "Health check-in",

          description:
            "A user-recorded health check-in is available.",

          domains: [
            "general-systemic",
            "mental-behavioral",
            "lifestyle",
          ],

          evidence: [
            evidence,
          ],

          priority:
            "monitor",
        });
      }
    );
}

function buildReportNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient
    .uploadedReports
    .map(
      (
        report,
        index
      ) => {
        const record =
          asRecord(
            report
          );

        const sourceId =
          readIdentifier(
            record,
            `report-${index}`
          );

        const fileName =
          readString(
            record,
            [
              "file_name",
              "fileName",
            ]
          ) ??
          "Medical report";

        const reportType =
          readString(
            record,
            [
              "report_type",
              "reportType",
            ]
          );

        const extractionStatus =
          readString(
            record,
            [
              "extraction_status",
              "extractionStatus",
            ]
          );

        const observedAt =
          readString(
            record,
            [
              "created_at",
              "createdAt",
            ]
          );

        const evidence =
          createEvidenceReference({
            id:
              `evidence:report:${sourceId}`,

            sourceType:
              "uploaded-report",

            sourceId,

            label:
              fileName,

            value:
              extractionStatus,

            observedAt,

            confidence:
              extractionStatus ===
                "Completed"
                ? "high"
                : "moderate",
          });

        const domains:
          WholeBodyHealthDomain[] = [
            "general-systemic",
          ];

        if (
          reportType
        ) {
          domains.push(
            normalizeWholeBodyHealthDomain(
              reportType
            )
          );
        }

        return createNode({
          id:
            `node:report:${sourceId}`,

          type:
            "finding",

          label:
            fileName,

          description:
            reportType
              ? `Uploaded ${reportType} report.`
              : "Uploaded medical report.",

          domains,

          evidence: [
            evidence,
          ],

          priority:
            extractionStatus ===
              "Failed"
              ? "important"
              : "monitor",

          confidence:
            extractionStatus ===
              "Completed"
              ? "high"
              : "moderate",
        });
      }
    );
}

function buildInsightNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient
    .healthInsights
    .map(
      (
        insight,
        index
      ) => {
        const record =
          asRecord(
            insight
          );

        const sourceId =
          readIdentifier(
            record,
            `insight-${index}`
          );

        const title =
          readString(
            record,
            [
              "insight_title",
              "title",
            ]
          ) ??
          "Generated health insight";

        const summary =
          readString(
            record,
            [
              "summary",
            ]
          );

        const reportType =
          readString(
            record,
            [
              "report_type",
              "medical_category",
            ]
          );

        const riskLevel =
          readString(
            record,
            [
              "risk_level",
              "riskLevel",
            ]
          );

        const status =
          readString(
            record,
            [
              "ai_status",
              "status",
            ]
          );

        const observedAt =
          readString(
            record,
            [
              "created_at",
              "createdAt",
            ]
          );

        const domains:
          WholeBodyHealthDomain[] = [
            "general-systemic",
          ];

        if (
          reportType
        ) {
          domains.push(
            normalizeWholeBodyHealthDomain(
              reportType
            )
          );
        }

        const evidence =
          createEvidenceReference({
            id:
              `evidence:insight:${sourceId}`,

            sourceType:
              "generated-analysis",

            sourceId,

            label:
              title,

            value:
              summary ??
              status,

            observedAt,

            confidence:
              status ===
                "Generated"
                ? "high"
                : "moderate",
          });

        return createNode({
          id:
            `node:insight:${sourceId}`,

          type:
            riskLevel
              ? "risk"
              : "finding",

          label:
            title,

          description:
            summary,

          domains,

          evidence: [
            evidence,
          ],

          priority:
            normalizeRiskPriority(
              riskLevel
            ),

          confidence:
            status ===
              "Generated"
              ? "high"
              : "moderate",
        });
      }
    );
}

function normalizeRiskPriority(
  value:
    string | null
): ClinicalPriority {
  const normalized =
    value
      ?.trim()
      .toLowerCase() ??
    "";

  if (
    normalized.includes(
      "emergency"
    ) ||
    normalized.includes(
      "critical"
    )
  ) {
    return "emergency";
  }

  if (
    normalized.includes(
      "urgent"
    ) ||
    normalized.includes(
      "high"
    )
  ) {
    return "urgent";
  }

  if (
    normalized.includes(
      "moderate"
    ) ||
    normalized.includes(
      "medium"
    )
  ) {
    return "important";
  }

  if (
    normalized.includes(
      "low"
    )
  ) {
    return "monitor";
  }

  return "routine";
}

function buildHistoryNodes(
  patient:
    PatientSummary
): WholeBodyClinicalNode[] {
  return patient
    .historyItems
    .map(
      (
        historyItem,
        index
      ) => {
        const record =
          asRecord(
            historyItem
          );

        const sourceId =
          readIdentifier(
            record,
            `history-${index}`
          );

        const title =
          readString(
            record,
            [
              "title",
              "condition",
              "name",
              "history_type",
              "historyType",
            ]
          ) ??
          "Health history item";

        const description =
          readString(
            record,
            [
              "description",
              "notes",
              "details",
              "value",
            ]
          );

        const category =
          readString(
            record,
            [
              "category",
              "organ_name",
              "organName",
              "system",
            ]
          );

        const observedAt =
          readString(
            record,
            [
              "created_at",
              "createdAt",
              "date",
            ]
          );

        const domains:
          WholeBodyHealthDomain[] = [
            "general-systemic",
          ];

        if (
          category
        ) {
          domains.push(
            normalizeWholeBodyHealthDomain(
              category
            )
          );
        }

        const evidence =
          createEvidenceReference({
            id:
              `evidence:history:${sourceId}`,

            sourceType:
              "health-history",

            sourceId,

            label:
              title,

            value:
              description,

            observedAt,
          });

        return createNode({
          id:
            `node:history:${sourceId}`,

          type:
            "condition",

          label:
            title,

          description,

          domains,

          evidence: [
            evidence,
          ],

          priority:
            "monitor",
        });
      }
    );
}

function collectCoveredDomains(
  nodes:
    WholeBodyClinicalNode[]
): WholeBodyHealthDomain[] {
  return uniqueDomains(
    nodes.flatMap(
      (node) =>
        node.domains
    )
  );
}

export function buildWholeBodyClinicalKnowledge(
  patient:
    PatientSummary
): WholeBodyClinicalKnowledgeModel {
  const emptyModel =
    createEmptyWholeBodyClinicalKnowledgeModel();

    const nodes = [
    ...buildAssessmentNodes(
      patient
    ),

    ...buildCheckInNodes(
      patient
    ),

    ...buildReportNodes(
      patient
    ),

    ...buildInsightNodes(
      patient
    ),

    ...buildHistoryNodes(
      patient
    ),
  ];

   const relationships =
    buildWholeBodyClinicalRelationships({
      patient,
      nodes,
    });

  const knowledgeWithoutSufficiency:
    WholeBodyClinicalKnowledgeModel = {
      ...emptyModel,

      nodes,

      relationships,

      clarificationQuestions:
        [],

      coveredDomains:
        collectCoveredDomains(
          nodes
        ),

      unresolvedDomains:
        [],

      evidenceSufficiency:
        null,

      generatedAt:
        new Date().toISOString(),
    };

  const evidenceSufficiency =
    assessClinicalEvidenceSufficiency({
      knowledge:
        knowledgeWithoutSufficiency,
    });

  return {
    ...knowledgeWithoutSufficiency,

    evidenceSufficiency,
  };
}