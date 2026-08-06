import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  ClinicalEvidenceConfidence,
  ClinicalPriority,
  WholeBodyClinicalNode,
  WholeBodyClinicalRelationship,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type BuildWholeBodyClinicalRelationshipsInput = {
  patient:
    PatientSummary;

  nodes:
    WholeBodyClinicalNode[];
};

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

function readIdentifier(
  record:
    UnknownRecord,
  key:
    string
): string | null {
  const value =
    record[key];

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

  return null;
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

function getNodeById(
  nodesById:
    Map<
      string,
      WholeBodyClinicalNode
    >,
  nodeId:
    string
): WholeBodyClinicalNode | null {
  return (
    nodesById.get(
      nodeId
    ) ??
    null
  );
}

function getEvidenceIds(
  node:
    WholeBodyClinicalNode
): string[] {
  return node
    .evidence
    .map(
      (evidence) =>
        evidence.id
    );
}

function resolveRelationshipConfidence(
  reportRecord:
    UnknownRecord,
  insightRecord:
    UnknownRecord
): ClinicalEvidenceConfidence {
  const extractionStatus =
    readString(
      reportRecord,
      [
        "extraction_status",
        "extractionStatus",
      ]
    );

  const insightStatus =
    readString(
      insightRecord,
      [
        "ai_status",
        "status",
      ]
    );

  if (
    extractionStatus ===
      "Completed" &&
    insightStatus ===
      "Generated"
  ) {
    return "high";
  }

  return "moderate";
}

function resolveClinicalSignificance(
  insightNode:
    WholeBodyClinicalNode
): ClinicalPriority {
  return insightNode
    .priority;
}

function createReportInsightRelationship(
  input: {
    reportNode:
      WholeBodyClinicalNode;

    insightNode:
      WholeBodyClinicalNode;

    reportRecord:
      UnknownRecord;

    insightRecord:
      UnknownRecord;
  }
): WholeBodyClinicalRelationship {
  const reportEvidenceIds =
    getEvidenceIds(
      input.reportNode
    );

  const insightEvidenceIds =
    getEvidenceIds(
      input.insightNode
    );

  return {
    id:
      `relationship:${input.reportNode.id}:${input.insightNode.id}`,

    sourceNodeId:
      input.reportNode.id,

    targetNodeId:
      input.insightNode.id,

    type:
      "direct",

    explanation:
      "This generated health insight explicitly references this uploaded report.",

    supportingEvidenceIds: [
      ...reportEvidenceIds,
      ...insightEvidenceIds,
    ],

    contradictingEvidenceIds:
      [],

    confidence:
      resolveRelationshipConfidence(
        input.reportRecord,
        input.insightRecord
      ),

    clinicalSignificance:
      resolveClinicalSignificance(
        input.insightNode
      ),

    missingEvidence:
      [],
  };
}

function buildReportInsightRelationships(
  patient:
    PatientSummary,
  nodes:
    WholeBodyClinicalNode[]
): WholeBodyClinicalRelationship[] {
  const nodesById =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ]
      )
    );

  const reportRecordsById =
    new Map<
      string,
      UnknownRecord
    >();

  patient
    .uploadedReports
    .forEach(
      (report) => {
        const record =
          asRecord(
            report
          );

        const reportId =
          readIdentifier(
            record,
            "id"
          );

        if (
          reportId !==
          null
        ) {
          reportRecordsById.set(
            reportId,
            record
          );
        }
      }
    );

  const relationships:
    WholeBodyClinicalRelationship[] =
      [];

  patient
    .healthInsights
    .forEach(
      (insight) => {
        const insightRecord =
          asRecord(
            insight
          );

        const insightId =
          readIdentifier(
            insightRecord,
            "id"
          );

        const reportId =
          readIdentifier(
            insightRecord,
            "report_id"
          );

        if (
          insightId ===
            null ||
          reportId ===
            null
        ) {
          return;
        }

        const reportRecord =
          reportRecordsById.get(
            reportId
          );

        if (
          !reportRecord
        ) {
          return;
        }

        const reportNode =
          getNodeById(
            nodesById,
            `node:report:${reportId}`
          );

        const insightNode =
          getNodeById(
            nodesById,
            `node:insight:${insightId}`
          );

        if (
          !reportNode ||
          !insightNode
        ) {
          return;
        }

        relationships.push(
          createReportInsightRelationship({
            reportNode,
            insightNode,
            reportRecord,
            insightRecord,
          })
        );
      }
    );

  return relationships;
}

function removeDuplicateRelationships(
  relationships:
    WholeBodyClinicalRelationship[]
): WholeBodyClinicalRelationship[] {
  const relationshipsById =
    new Map<
      string,
      WholeBodyClinicalRelationship
    >();

  relationships.forEach(
    (relationship) => {
      relationshipsById.set(
        relationship.id,
        relationship
      );
    }
  );

  return [
    ...relationshipsById
      .values(),
  ];
}

export function buildWholeBodyClinicalRelationships({
  patient,
  nodes,
}: BuildWholeBodyClinicalRelationshipsInput):
  WholeBodyClinicalRelationship[] {
  const relationships = [
    ...buildReportInsightRelationships(
      patient,
      nodes
    ),
  ];

  return removeDuplicateRelationships(
    relationships
  );
}