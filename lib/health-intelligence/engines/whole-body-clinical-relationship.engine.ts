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

function getNodeObservationTime(
  node:
    WholeBodyClinicalNode
): number | null {
  const observedAt =
    node.evidence
      .map(
        (evidence) =>
          evidence.observedAt
      )
      .find(
        (value) =>
          typeof value ===
            "string" &&
          value.length >
            0
      );

  if (
    !observedAt
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      observedAt
    );

  return Number.isNaN(
    timestamp
  )
    ? null
    : timestamp;
}

function getSharedClinicalDomains(
  firstNode:
    WholeBodyClinicalNode,
  secondNode:
    WholeBodyClinicalNode
): string[] {
  return firstNode.domains.filter(
    (domain) =>
      domain !==
        "general-systemic" &&
      secondNode.domains.includes(
        domain
      )
  );
}

function buildSameDomainReportTemporalRelationships(
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

  const reportNodes =
    patient.uploadedReports
      .map(
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
            reportId ===
              null
          ) {
            return null;
          }

          return getNodeById(
            nodesById,
            `node:report:${reportId}`
          );
        }
           )
      .filter(
        (
          node
        ): node is WholeBodyClinicalNode =>
          node !==
          null &&
          getNodeObservationTime(
            node
          ) !==
          null
      )
      .sort(
        (
          first,
          second
        ) => {
                    const firstTime =
            getNodeObservationTime(
              first
            );

          const secondTime =
            getNodeObservationTime(
              second
            );

          if (
            firstTime ===
              null ||
            secondTime ===
              null
          ) {
            return first.id.localeCompare(
              second.id
            );
          }

          const timeDifference =
            firstTime -
            secondTime;

          if (
            timeDifference !==
              0
          ) {
            return timeDifference;
          }

          return first.id.localeCompare(
            second.id
          );
        }
      );

  const relationships:
    WholeBodyClinicalRelationship[] =
      [];

  for (
    let firstIndex =
      0;
    firstIndex <
      reportNodes.length;
    firstIndex +=
      1
  ) {
    for (
      let secondIndex =
        firstIndex +
        1;
      secondIndex <
        reportNodes.length;
      secondIndex +=
        1
    ) {
      const firstNode =
        reportNodes[
          firstIndex
        ];

      const secondNode =
        reportNodes[
          secondIndex
        ];

      const sharedDomains =
        getSharedClinicalDomains(
          firstNode,
          secondNode
        );

      if (
        sharedDomains.length ===
          0
      ) {
        continue;
      }

      relationships.push({
        id:
          `relationship:temporal:${firstNode.id}:${secondNode.id}`,

        sourceNodeId:
          firstNode.id,

        targetNodeId:
          secondNode.id,

        type:
          "temporal",

        explanation:
          `These uploaded reports share the ${sharedDomains.join(
            ", "
          )} clinical domain and provide longitudinal context across different points in time. This relationship does not imply causation, improvement, or deterioration.`,

        supportingEvidenceIds: [
          ...getEvidenceIds(
            firstNode
          ),

          ...getEvidenceIds(
            secondNode
          ),
        ],

        contradictingEvidenceIds:
          [],

        confidence:
          "moderate",

        clinicalSignificance:
          "monitor",

        missingEvidence: [
          "Comparable clinical findings or measurements across reports are required before interpreting change over time.",
        ],
      });
    }
  }

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

    ...buildSameDomainReportTemporalRelationships(
      patient,
      nodes
    ),
  ];

  return removeDuplicateRelationships(
    relationships
  );
}