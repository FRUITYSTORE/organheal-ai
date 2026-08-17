import type {
  ClinicalEvidenceWeightCollection,
  ClinicalEvidenceWeightResult,
} from "@/lib/health-intelligence/models/clinical-evidence-weight";

import type {
  ClinicalHypothesis,
  ClinicalHypothesisCollection,
  ClinicalHypothesisEvidence,
  ClinicalHypothesisKind,
} from "@/lib/health-intelligence/models/clinical-hypothesis";

import type {
  ClinicalRelationshipType,
  WholeBodyClinicalKnowledgeModel,
  WholeBodyClinicalNode,
  WholeBodyClinicalRelationship,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type BuildClinicalHypothesisFoundationInput = {
  knowledge: WholeBodyClinicalKnowledgeModel;

  evidenceWeights: ClinicalEvidenceWeightCollection;

  referenceTime?: string | Date;
};

const MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT = 0.5;

const MINIMUM_SUPPORTING_EVIDENCE_COUNT = 2;

const INTERPRETATION_BOUNDARY =
  "This is an evidence-grounded interpretive hypothesis, not a confirmed diagnosis. It must be reviewed alongside the complete clinical history, examination, and appropriate professional assessment.";

function normalizeReferenceTime(value: string | Date | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function createEvidenceWeightMap(
  evidenceWeights: ClinicalEvidenceWeightCollection,
): Map<string, ClinicalEvidenceWeightResult> {
  return new Map(
    evidenceWeights.evidence.map((evidence) => [evidence.evidenceId, evidence]),
  );
}

function findNode(
  knowledge: WholeBodyClinicalKnowledgeModel,
  nodeId: string,
): WholeBodyClinicalNode | null {
  return knowledge.nodes.find((node) => node.id === nodeId) ?? null;
}

function mapRelationshipKind(
  relationshipType: ClinicalRelationshipType,
): ClinicalHypothesisKind {
  if (
    relationshipType === "risk-factor" ||
    relationshipType === "protective-factor"
  ) {
    return "risk-pattern";
  }

  if (relationshipType === "cross-system") {
    return "cross-system-connection";
  }

  if (relationshipType === "medication-related") {
    return "medication-related";
  }

  if (relationshipType === "lifestyle-related") {
    return "lifestyle-related";
  }

  if (
    relationshipType === "requires-exclusion" ||
    relationshipType === "requires-confirmation"
  ) {
    return "requires-exclusion";
  }

  return "possible-explanation";
}

function mapEvidence(
  evidenceId: string,
  weightMap: Map<string, ClinicalEvidenceWeightResult>,
  explanation: string,
): ClinicalHypothesisEvidence | null {
  const weightedEvidence = weightMap.get(evidenceId);

  if (!weightedEvidence) {
    return null;
  }

  return {
    evidenceId,

    normalizedWeight: weightedEvidence.normalizedWeight,

    explanation,
  };
}

function collectRelationshipEvidence(
  evidenceIds: string[],
  weightMap: Map<string, ClinicalEvidenceWeightResult>,
  explanation: string,
): ClinicalHypothesisEvidence[] {
  return evidenceIds
    .map((evidenceId) => mapEvidence(evidenceId, weightMap, explanation))
    .filter(
      (evidence): evidence is ClinicalHypothesisEvidence => evidence !== null,
    );
}

function collectContextualEvidence(
  nodes: Array<WholeBodyClinicalNode | null>,
  weightMap: Map<string, ClinicalEvidenceWeightResult>,
  excludedIds: Set<string>,
): ClinicalHypothesisEvidence[] {
  const contextualEvidence = nodes
    .filter((node): node is WholeBodyClinicalNode => node !== null)
    .flatMap((node) => node.evidence)
    .filter(
      (evidence) =>
        evidence.relevance === "contextual" && !excludedIds.has(evidence.id),
    )
    .map((evidence) =>
      mapEvidence(
        evidence.id,
        weightMap,
        "This evidence provides relevant clinical context but does not independently establish the proposed relationship.",
      ),
    )
    .filter(
      (evidence): evidence is ClinicalHypothesisEvidence => evidence !== null,
    );

  const uniqueEvidence = new Map<string, ClinicalHypothesisEvidence>();

  for (const evidence of contextualEvidence) {
    uniqueEvidence.set(evidence.evidenceId, evidence);
  }

  return [...uniqueEvidence.values()];
}

function collectDomains(
  sourceNode: WholeBodyClinicalNode | null,
  targetNode: WholeBodyClinicalNode | null,
): WholeBodyHealthDomain[] {
  return uniqueValues([
    ...(sourceNode?.domains ?? []),

    ...(targetNode?.domains ?? []),
  ]);
}

function buildHypothesisTitle(
  sourceNode: WholeBodyClinicalNode | null,
  targetNode: WholeBodyClinicalNode | null,
  relationship: WholeBodyClinicalRelationship,
): string {
  if (sourceNode && targetNode) {
    return `${sourceNode.label} may be clinically related to ${targetNode.label}`;
  }

  return `Interpretive hypothesis from ${relationship.type} relationship`;
}

function canGenerateFromRelationship(
  relationship: WholeBodyClinicalRelationship,
  weightMap: Map<string, ClinicalEvidenceWeightResult>,
): boolean {
  const eligibleSupportingCount = relationship.supportingEvidenceIds.filter(
    (evidenceId) =>
      (weightMap.get(evidenceId)?.normalizedWeight ?? 0) >=
      MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT,
  ).length;

  return eligibleSupportingCount >= MINIMUM_SUPPORTING_EVIDENCE_COUNT;
}

function buildCandidateHypothesis(
  relationship: WholeBodyClinicalRelationship,
  knowledge: WholeBodyClinicalKnowledgeModel,
  weightMap: Map<string, ClinicalEvidenceWeightResult>,
  generatedAt: string,
): ClinicalHypothesis | null {
  if (!canGenerateFromRelationship(relationship, weightMap)) {
    return null;
  }

  const sourceNode = findNode(knowledge, relationship.sourceNodeId);

  const targetNode = findNode(knowledge, relationship.targetNodeId);

  const supportingEvidence = collectRelationshipEvidence(
    relationship.supportingEvidenceIds,
    weightMap,
    "This weighted evidence supports evaluating the explicit clinical relationship.",
  );

  const contradictingEvidence = collectRelationshipEvidence(
    relationship.contradictingEvidenceIds,
    weightMap,
    "This weighted evidence may weaken, limit, or provide an alternative interpretation of the relationship.",
  );

  const explicitlyUsedEvidenceIds = new Set([
    ...relationship.supportingEvidenceIds,

    ...relationship.contradictingEvidenceIds,
  ]);

  const contextualEvidence = collectContextualEvidence(
    [sourceNode, targetNode],
    weightMap,
    explicitlyUsedEvidenceIds,
  );

  return {
    id: `hypothesis:${relationship.id}`,

    title: buildHypothesisTitle(sourceNode, targetNode, relationship),

    description: relationship.explanation,

    kind: mapRelationshipKind(relationship.type),

    status: "candidate",

    domains: collectDomains(sourceNode, targetNode),

    priority: relationship.clinicalSignificance,

    confidence: relationship.confidence,

    supportingEvidence,

    contradictingEvidence,

    contextualEvidence,

    missingEvidence: [...relationship.missingEvidence],

    affectedNodeIds: uniqueValues([
      relationship.sourceNodeId,

      relationship.targetNodeId,
    ]),

    affectedRelationshipIds: [relationship.id],

    interpretationBoundary: INTERPRETATION_BOUNDARY,

    generatedAt,
  };
}

export function buildClinicalHypothesisFoundation({
  knowledge,
  evidenceWeights,
  referenceTime,
}: BuildClinicalHypothesisFoundationInput): ClinicalHypothesisCollection {
  const generatedAt = normalizeReferenceTime(referenceTime).toISOString();

  const eligibleEvidence = evidenceWeights.evidence.filter(
    (evidence) => evidence.normalizedWeight >= MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT,
  );

  const excludedEvidence = evidenceWeights.evidence.filter(
    (evidence) => evidence.normalizedWeight < MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT,
  );

  const evidenceCount = evidenceWeights.evidence.length;

  const eligibleEvidenceCount = eligibleEvidence.length;

  const relationshipCount = knowledge.relationships.length;

  if (evidenceCount === 0) {
    return {
      status: "no-evidence",

      hypotheses: [],

      eligibleEvidenceIds: [],

      excludedEvidenceIds: [],

      evidenceCount: 0,

      eligibleEvidenceCount: 0,

      relationshipCount,

      generatedHypothesisCount: 0,

      generationAllowed: false,

      reason:
        "No clinical evidence is available. Interpretive hypotheses must not be generated.",

      safetyBoundary:
        "This engine does not diagnose disease and does not generate unsupported disease probabilities.",

      generatedAt,
    };
  }

  const weightMap = createEvidenceWeightMap(evidenceWeights);

  const hypotheses = knowledge.relationships
    .map((relationship) =>
      buildCandidateHypothesis(relationship, knowledge, weightMap, generatedAt),
    )
    .filter(
      (hypothesis): hypothesis is ClinicalHypothesis => hypothesis !== null,
    );

  const generationAllowed = hypotheses.length > 0;

  return {
    status: generationAllowed
      ? "hypotheses-generated"
      : "insufficient-foundation",

    hypotheses,

    eligibleEvidenceIds: eligibleEvidence.map(
      (evidence) => evidence.evidenceId,
    ),

    excludedEvidenceIds: excludedEvidence.map(
      (evidence) => evidence.evidenceId,
    ),

    evidenceCount,

    eligibleEvidenceCount,

    relationshipCount,

    generatedHypothesisCount: hypotheses.length,

    generationAllowed,

    reason: generationAllowed
      ? "Evidence-grounded candidate hypotheses were generated only from explicit clinical relationships with sufficient weighted supporting evidence."
      : "No explicit clinical relationship had enough eligible weighted supporting evidence to generate a candidate hypothesis safely.",

    safetyBoundary:
      "Generated candidates are interpretive hypotheses only. They do not diagnose disease, assign disease probabilities, or convert associations into confirmed causal conclusions.",

    generatedAt,
  };
}
