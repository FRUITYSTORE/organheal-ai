import type {
  ClinicalPriority,
  WholeBodyClinicalNode,
  WholeBodyClinicalRelationship,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

type BuildLaboratoryMarkerRelationshipsInput = {
  nodes:
    WholeBodyClinicalNode[];
};

const PRIORITY_RANK:
  Record<
    ClinicalPriority,
    number
  > = {
    routine:
      0,

    monitor:
      1,

    important:
      2,

    urgent:
      3,

    emergency:
      4,
  };

function getEvidenceIds(
  node:
    WholeBodyClinicalNode
): string[] {
  return node.evidence.map(
    (evidence) =>
      evidence.id
  );
}

function getMarkerReportId(
  node:
    WholeBodyClinicalNode
): string | null {
  const laboratoryEvidence =
    node.evidence.find(
      (evidence) =>
        evidence.sourceType ===
        "laboratory-result"
    );

  return (
    laboratoryEvidence?.sourceId ??
    null
  );
}

function getSharedDomains(
  firstNode:
    WholeBodyClinicalNode,
  secondNode:
    WholeBodyClinicalNode
): WholeBodyHealthDomain[] {
  return firstNode.domains.filter(
    (domain) =>
      domain !==
        "general-systemic" &&
      secondNode.domains.includes(
        domain
      )
  );
}

function resolveHigherPriority(
  firstPriority:
    ClinicalPriority,
  secondPriority:
    ClinicalPriority
): ClinicalPriority {
  return PRIORITY_RANK[
    firstPriority
  ] >=
    PRIORITY_RANK[
      secondPriority
    ]
    ? firstPriority
    : secondPriority;
}

function buildReportMarkerRelationships(
  nodes:
    WholeBodyClinicalNode[]
): WholeBodyClinicalRelationship[] {
  const reportNodesById =
    new Map<
      string,
      WholeBodyClinicalNode
    >();

  nodes
    .filter(
      (node) =>
        node.id.startsWith(
          "node:report:"
        )
    )
    .forEach(
      (node) => {
        const reportId =
          node.id.replace(
            "node:report:",
            ""
          );

        reportNodesById.set(
          reportId,
          node
        );
      }
    );

  return nodes
    .filter(
      (node) =>
        node.type ===
        "laboratory-marker"
    )
    .flatMap(
      (markerNode) => {
        const reportId =
          getMarkerReportId(
            markerNode
          );

        if (
          reportId === null
        ) {
          return [];
        }

        const reportNode =
          reportNodesById.get(
            reportId
          );

        if (
          !reportNode
        ) {
          return [];
        }

        return [
          {
            id:
              `relationship:report-marker:${reportNode.id}:${markerNode.id}`,

            sourceNodeId:
              reportNode.id,

            targetNodeId:
              markerNode.id,

            type:
              "direct",

            explanation:
              "This laboratory marker was extracted from this uploaded report.",

            supportingEvidenceIds: [
              ...getEvidenceIds(
                reportNode
              ),

              ...getEvidenceIds(
                markerNode
              ),
            ],

            contradictingEvidenceIds:
              [],

            confidence:
              markerNode.confidence,

            clinicalSignificance:
              markerNode.priority,

            missingEvidence:
              [],
          },
        ];
      }
    );
}

function buildSameReportMarkerRelationships(
  nodes:
    WholeBodyClinicalNode[]
): WholeBodyClinicalRelationship[] {
  const markerNodes =
    nodes.filter(
      (node) =>
        node.type ===
        "laboratory-marker"
    );

  const relationships:
    WholeBodyClinicalRelationship[] =
      [];

  for (
    let firstIndex =
      0;
    firstIndex <
      markerNodes.length;
    firstIndex +=
      1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        markerNodes.length;
      secondIndex +=
        1
    ) {
      const firstNode =
        markerNodes[
          firstIndex
        ];

      const secondNode =
        markerNodes[
          secondIndex
        ];

      const firstReportId =
        getMarkerReportId(
          firstNode
        );

      const secondReportId =
        getMarkerReportId(
          secondNode
        );

      if (
        firstReportId === null ||
        secondReportId === null ||
        firstReportId !==
          secondReportId
      ) {
        continue;
      }

      const sharedDomains =
        getSharedDomains(
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
          `relationship:marker-context:${firstNode.id}:${secondNode.id}`,

        sourceNodeId:
          firstNode.id,

        targetNodeId:
          secondNode.id,

        type:
          "associated",

        explanation:
          `${firstNode.label} and ${secondNode.label} were reported together and share the ${sharedDomains.join(
            ", "
          )} clinical domain. They should be interpreted together with relevant patient context; this relationship alone does not establish diagnosis or causation.`,

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
          resolveHigherPriority(
            firstNode.priority,
            secondNode.priority
          ),

        missingEvidence: [
          "Relevant symptoms, medical history, medications, and comparable measurements may be required for a stronger interpretation.",
        ],
      });
    }
  }

  return relationships;
}

export function buildLaboratoryMarkerRelationships({
  nodes,
}: BuildLaboratoryMarkerRelationshipsInput):
  WholeBodyClinicalRelationship[] {
  return [
    ...buildReportMarkerRelationships(
      nodes
    ),

    ...buildSameReportMarkerRelationships(
      nodes
    ),
  ];
}