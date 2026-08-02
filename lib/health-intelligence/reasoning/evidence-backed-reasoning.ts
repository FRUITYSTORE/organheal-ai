import {
  getRegisteredHypothesisGenerators,
} from "./generators/hypothesis-generator.registry";

import {
  calculateHypothesisConfidence,
} from "./confidence/hypothesis-confidence-calculator";

export type EvidenceConfidence =
  | "low"
  | "moderate"
  | "high";

export type EvidenceSource =
  | "user"
  | "report"
  | "health-context"
  | "derived";

export type ReasoningEvidence = {
  statement: string;
  source: EvidenceSource;
};

export type EvidenceBackedHypothesis = {
  id: string;
  title: string;

  confidence: EvidenceConfidence;

  supportingEvidence: ReasoningEvidence[];
  conflictingEvidence: ReasoningEvidence[];
  missingEvidence: string[];

  rationale: string;

  /*
   * A hypothesis generated through this layer remains
   * a bounded interpretation, not a confirmed diagnosis.
   */
  diagnosticClaim: false;
};

export type HypothesisCandidateInput = {
  id: string;
  title: string;

  supportingEvidence: ReasoningEvidence[];
  conflictingEvidence?: ReasoningEvidence[];
  missingEvidence?: string[];

  rationale: string;

  requestedConfidence?: EvidenceConfidence;
};
export type HypothesisCandidateSource =
  | "rule-engine"
  | "report-analysis"
  | "health-context"
  | "timeline"
  | "ai-model"
  | "manual";

export type HypothesisCandidateGenerationMode =
  | "deterministic"
  | "model-assisted"
  | "manual";

export type HypothesisCandidateGenerationMetadata = {
  /*
   * Stable identifier for the generator implementation.
   *
   * Examples:
   * - symptom-pattern-generator
   * - laboratory-pattern-generator
   * - report-summary-generator
   */
  generatorId: string;

  /*
   * Human-readable generator version retained for auditability.
   *
   * This allows future reasoning results to identify which
   * generation policy produced a candidate.
   */
  generatorVersion: string;

  source: HypothesisCandidateSource;
  mode: HypothesisCandidateGenerationMode;

  /*
   * Explains why the generator produced this candidate.
   *
   * This is distinct from candidate.rationale:
   * - generationReason explains why the candidate was emitted
   * - rationale explains why the interpretation may fit
   */
  generationReason: string;

  generatedAt: string;
};

export type GeneratedHypothesisCandidate = {
  candidate: HypothesisCandidateInput;

  generation:
    HypothesisCandidateGenerationMetadata;

  /*
   * Generated candidates remain non-diagnostic before and
   * after they enter the evaluation pipeline.
   */
  diagnosticClaim: false;
};
export type HypothesisGenerationContext = {
  /*
   * Canonical health facts extracted from the raw reasoning
   * input. Future generators should prefer these facts over
   * parsing raw evidence text.
   */
  facts: HealthFacts;

  /*
   * Preserved evidence for explainability and provenance.
   */
  confirmedEvidence: ReasoningEvidence[];

  readyForHypothesisReasoning: boolean;

  hypothesisGate: {
    allowed: boolean;
    reason: string;
  };
};

export type HypothesisGenerationRule = {
  /*
   * Stable rule identifier.
   */
  id: string;

  /*
   * Human-readable rule name.
   */
  name: string;

  /*
   * Executes the rule and returns zero or more generated
   * candidates. The rule itself decides whether it matches
   * the available evidence.
   */
  generate(
    context: HypothesisGenerationContext
  ): GeneratedHypothesisCandidate[];
};
export type HypothesisGenerationRuleResult = {
  ruleId: string;
  ruleName: string;

  generatedCandidateCount: number;

  generatedCandidates:
    GeneratedHypothesisCandidate[];
};

export type HypothesisGenerationResult = {
  status:
    | "blocked"
    | "completed";

  gateAllowed: boolean;
  gateReason: string;

  ruleResults:
    HypothesisGenerationRuleResult[];

  generatedCandidates:
    GeneratedHypothesisCandidate[];

  executedRuleCount: number;
  generatedCandidateCount: number;
};
export type HypothesisReasoningCompositionResult = {
  generation:
    HypothesisGenerationResult;

  pipeline:
    HypothesisReasoningPipelineResult;
};
export type HypothesisEvaluationStatus =
  | "accepted"
  | "rejected";

export type HypothesisEvaluationReason =
  | "missing-id"
  | "missing-title"
  | "missing-rationale"
  | "missing-supporting-evidence"
  | "accepted-with-low-confidence"
  | "accepted-with-moderate-confidence"
  | "accepted-with-high-confidence";

export type HypothesisReasoningTrace = {
  supportingEvidenceCount: number;
  conflictingEvidenceCount: number;
  missingEvidenceCount: number;

  requestedConfidence: EvidenceConfidence | null;
  permittedConfidence: EvidenceConfidence | null;

  confidenceConstrained: boolean;

  notes: string[];
};

export type HypothesisCandidateEvaluation = {
  status: HypothesisEvaluationStatus;
  reason: HypothesisEvaluationReason;

  hypothesis: EvidenceBackedHypothesis | null;

  reasoningTrace: HypothesisReasoningTrace;
};

export type AcceptedHypothesisEvaluation =
  HypothesisCandidateEvaluation & {
    status: "accepted";
    hypothesis: EvidenceBackedHypothesis;
  };

export type HypothesisRankingFactors = {
  confidenceWeight: number;
  supportingEvidenceScore: number;
  conflictingEvidencePenalty: number;
  missingEvidencePenalty: number;
  confidenceConstraintPenalty: number;

  totalScore: number;
};

export type RankedHypothesisEvaluation = {
  rank: number;
  score: number;

  evaluation: AcceptedHypothesisEvaluation;

  rankingFactors: HypothesisRankingFactors;
};

export type LeadingInterpretation = {
  /*
   * Stable hypothesis identity retained so downstream consumers
   * can reference the selected interpretation without relying
   * on its display title.
   */
  hypothesisId: string;

  title: string;
  rationale: string;

  /*
   * Ranking metadata is preserved rather than recomputed by
   * downstream presentation or reporting layers.
   */
  rank: number;
  score: number;

  confidence: EvidenceConfidence;

  supportingEvidence: ReasoningEvidence[];
  conflictingEvidence: ReasoningEvidence[];
  missingEvidence: string[];

  reasoningTrace: HypothesisReasoningTrace;
  rankingFactors: HypothesisRankingFactors;

  /*
   * A leading interpretation remains a bounded explanation.
   * Its selection must never convert it into a diagnosis.
   */
  diagnosticClaim: false;
};

export type HypothesisCandidateSetStatus =
  | "blocked"
  | "evaluated";

export type HypothesisCandidateSetEvaluation = {
  status: HypothesisCandidateSetStatus;

  gateAllowed: boolean;
  gateReason: string;

  /*
   * Complete evaluation history for all unique candidates
   * that reached the evaluator.
   */
  evaluations: HypothesisCandidateEvaluation[];

  /*
   * Preserve the full accepted and rejected evaluations so
   * later ranking and explanation layers retain the complete
   * reasoning trace.
   */
  acceptedEvaluations: HypothesisCandidateEvaluation[];
  rejectedEvaluations: HypothesisCandidateEvaluation[];

  /*
   * Convenience projection retained for callers that only need
   * the accepted hypothesis objects.
   */
  acceptedHypotheses: EvidenceBackedHypothesis[];

  acceptedCount: number;
  rejectedCount: number;
  duplicateCandidateCount: number;
};
export type HypothesisReasoningPipelineResult = {
  /*
   * Full candidate-set evaluation is preserved so callers can
   * inspect accepted, rejected, duplicate, and blocked results.
   */
  candidateSetEvaluation:
    HypothesisCandidateSetEvaluation;

  /*
   * Ranked evaluations remain separate from the evaluator's
   * original accepted-evaluation ordering.
   */
  rankedEvaluations:
    RankedHypothesisEvaluation[];

  /*
   * The leading interpretation is selected only from accepted
   * and ranked evaluations.
   */
  leadingInterpretation:
    LeadingInterpretation | null;
};
export type EvidenceBackedReasoningResult = {
  confirmedEvidence: ReasoningEvidence[];

  hypotheses: EvidenceBackedHypothesis[];

    leadingInterpretation:
    LeadingInterpretation | null;

  uncertainty: string;

  readyForHypothesisReasoning: boolean;

  hypothesisGate: {
    allowed: boolean;
    reason: string;
  };
};

export type EvidenceBackedReasoningInput = {
  symptoms: string[];
  onset: string | null;
  severity: string | null;

  associatedSymptoms: string[];
  associatedSymptomsKnown: boolean;

  reportSummary?: string | null;
  reportKeyFindings?: string | null;
  reportRiskLevel?: string | null;
};
export type HealthFacts = {
  /*
   * Basic evidence inventory.
   */
  evidenceCount: number;

  symptomCount: number;

  hasSymptoms: boolean;

  hasOnset: boolean;

  hasSeverity: boolean;

  hasAssociatedSymptoms: boolean;

  hasReportSummary: boolean;

  hasReportFindings: boolean;

  hasReportRiskLevel: boolean;

  /*
   * High-level reasoning readiness.
   */
  readyForReasoning: boolean;
};
function normalizeText(
  value: string
): string {
  return value.trim();
}

function normalizeEvidence(
  evidence: ReasoningEvidence[]
): ReasoningEvidence[] {
  const normalizedEvidence: ReasoningEvidence[] = [];

  const seenStatements =
    new Set<string>();

  for (const item of evidence) {
    const statement =
      normalizeText(item.statement);

    if (!statement) {
      continue;
    }

    const comparisonKey =
      `${item.source}:${statement.toLowerCase()}`;

    if (seenStatements.has(comparisonKey)) {
      continue;
    }

    seenStatements.add(comparisonKey);

    normalizedEvidence.push({
      statement,
      source: item.source,
    });
  }

  return normalizedEvidence;
}

function normalizeMissingEvidence(
  missingEvidence: string[]
): string[] {
  const normalizedItems: string[] = [];

  const seenItems =
    new Set<string>();

  for (const item of missingEvidence) {
    const normalizedItem =
      normalizeText(item);

    if (!normalizedItem) {
      continue;
    }

    const comparisonKey =
      normalizedItem.toLowerCase();

    if (seenItems.has(comparisonKey)) {
      continue;
    }

    seenItems.add(comparisonKey);
    normalizedItems.push(normalizedItem);
  }

  return normalizedItems;
}

function buildRejectedEvaluation(
  reason: HypothesisEvaluationReason,
  candidate: HypothesisCandidateInput,
  supportingEvidence: ReasoningEvidence[],
  conflictingEvidence: ReasoningEvidence[],
  missingEvidence: string[],
  note: string
): HypothesisCandidateEvaluation {
  return {
    status: "rejected",
    reason,

    hypothesis: null,

    reasoningTrace: {
      supportingEvidenceCount:
        supportingEvidence.length,

      conflictingEvidenceCount:
        conflictingEvidence.length,

      missingEvidenceCount:
        missingEvidence.length,

      requestedConfidence:
        candidate.requestedConfidence ?? null,

      permittedConfidence: null,

      confidenceConstrained: false,

      notes: [note],
    },
  };
}

export function evaluateHypothesisCandidate(
  candidate: HypothesisCandidateInput
): HypothesisCandidateEvaluation {
  const id =
    normalizeText(candidate.id);

  const title =
    normalizeText(candidate.title);

  const rationale =
    normalizeText(candidate.rationale);

  const supportingEvidence =
    normalizeEvidence(
      candidate.supportingEvidence
    );

  const conflictingEvidence =
    normalizeEvidence(
      candidate.conflictingEvidence ?? []
    );

  const missingEvidence =
    normalizeMissingEvidence(
      candidate.missingEvidence ?? []
    );

  if (!id) {
    return buildRejectedEvaluation(
      "missing-id",
      candidate,
      supportingEvidence,
      conflictingEvidence,
      missingEvidence,
      "The candidate was rejected because it does not have a stable identifier."
    );
  }

  if (!title) {
    return buildRejectedEvaluation(
      "missing-title",
      candidate,
      supportingEvidence,
      conflictingEvidence,
      missingEvidence,
      "The candidate was rejected because it does not have a title."
    );
  }

  if (!rationale) {
    return buildRejectedEvaluation(
      "missing-rationale",
      candidate,
      supportingEvidence,
      conflictingEvidence,
      missingEvidence,
      "The candidate was rejected because it does not explain its reasoning."
    );
  }

  /*
   * Hard evidence gate:
   * No hypothesis can be accepted without explicit
   * supporting evidence.
   */
  if (supportingEvidence.length === 0) {
    return buildRejectedEvaluation(
      "missing-supporting-evidence",
      candidate,
      supportingEvidence,
      conflictingEvidence,
      missingEvidence,
      "The candidate was rejected because no explicit supporting evidence was provided."
    );
  }

 const confidenceEvaluation =
  calculateHypothesisConfidence({
    requestedConfidence:
      candidate.requestedConfidence ??
      null,

    supportingEvidenceCount:
      supportingEvidence.length,

    conflictingEvidenceCount:
      conflictingEvidence.length,

    missingEvidenceCount:
      missingEvidence.length,
  });

  const hypothesis: EvidenceBackedHypothesis = {
    id,
    title,

    confidence:
      confidenceEvaluation.confidence,

    supportingEvidence,
    conflictingEvidence,
    missingEvidence,

    rationale,

    diagnosticClaim: false,
  };

  const acceptanceReason:
    HypothesisEvaluationReason =
      hypothesis.confidence === "high"
        ? "accepted-with-high-confidence"
        : hypothesis.confidence === "moderate"
          ? "accepted-with-moderate-confidence"
          : "accepted-with-low-confidence";

  return {
    status: "accepted",
    reason: acceptanceReason,

    hypothesis,

    reasoningTrace: {
      supportingEvidenceCount:
        supportingEvidence.length,

      conflictingEvidenceCount:
        conflictingEvidence.length,

      missingEvidenceCount:
        missingEvidence.length,

      requestedConfidence:
        candidate.requestedConfidence ?? null,

      permittedConfidence:
  confidenceEvaluation.permittedConfidence,

      confidenceConstrained:
        confidenceEvaluation.confidenceConstrained,

      notes:
        confidenceEvaluation.notes,
    },
  };
}

/*
 * Backward-compatible creation helper.
 *
 * Existing callers may continue requesting a hypothesis directly.
 * Internally, every candidate must pass through the evaluator first.
 */
export function evaluateHypothesisCandidateSet(
  candidates: HypothesisCandidateInput[],
  gate: {
    allowed: boolean;
    reason: string;
  }
): HypothesisCandidateSetEvaluation {
  if (!gate.allowed) {
    return {
      status: "blocked",

      gateAllowed: false,
      gateReason: gate.reason,

          evaluations: [],

      acceptedEvaluations: [],
      rejectedEvaluations: [],

      acceptedHypotheses: [],

      acceptedCount: 0,
      rejectedCount: candidates.length,
      duplicateCandidateCount: 0,
    };
  }

  const evaluations: HypothesisCandidateEvaluation[] = [];

  const acceptedEvaluations: HypothesisCandidateEvaluation[] = [];
  const rejectedEvaluations: HypothesisCandidateEvaluation[] = [];

  const acceptedHypotheses: EvidenceBackedHypothesis[] = [];

  const seenCandidateIds = new Set<string>();

  let duplicateCandidateCount = 0;

  for (const candidate of candidates) {
    const normalizedCandidateId =
      normalizeText(candidate.id).toLowerCase();

    /*
     * Duplicate candidate identifiers are ignored before
     * evaluation so the same interpretation cannot be counted
     * more than once in a reasoning result.
     *
     * Empty identifiers are not handled here because the
     * single-candidate evaluator must reject them explicitly
     * with the "missing-id" reason.
     */
    if (
      normalizedCandidateId &&
      seenCandidateIds.has(normalizedCandidateId)
    ) {
      duplicateCandidateCount += 1;
      continue;
    }

    if (normalizedCandidateId) {
      seenCandidateIds.add(normalizedCandidateId);
    }

    const evaluation =
      evaluateHypothesisCandidate(candidate);

     evaluations.push(evaluation);

    if (
      evaluation.status === "accepted" &&
      evaluation.hypothesis
    ) {
      acceptedEvaluations.push(evaluation);

      acceptedHypotheses.push(
        evaluation.hypothesis
      );

      continue;
    }

    rejectedEvaluations.push(evaluation);
  }

    return {
    status: "evaluated",

    gateAllowed: true,
    gateReason: gate.reason,

        evaluations,

    acceptedEvaluations,
    rejectedEvaluations,

    acceptedHypotheses,

    acceptedCount:
      acceptedEvaluations.length,

    rejectedCount:
      rejectedEvaluations.length,

    duplicateCandidateCount,
  };
}
const HYPOTHESIS_RANKING_POLICY = {
  confidenceWeight: {
    low: 100,
    moderate: 200,
    high: 300,
  } satisfies Record<EvidenceConfidence, number>,

  supportingEvidencePoint: 10,
  conflictingEvidencePenalty: 20,
  missingEvidencePenalty: 10,
  confidenceConstraintPenalty: 15,
} as const;

function isAcceptedHypothesisEvaluation(
  evaluation: HypothesisCandidateEvaluation
): evaluation is AcceptedHypothesisEvaluation {
  return (
    evaluation.status === "accepted" &&
    evaluation.hypothesis !== null
  );
}

function calculateHypothesisRankingFactors(
  evaluation: AcceptedHypothesisEvaluation
): HypothesisRankingFactors {
  const confidenceWeight =
    HYPOTHESIS_RANKING_POLICY.confidenceWeight[
      evaluation.hypothesis.confidence
    ];

  const supportingEvidenceScore =
    evaluation.reasoningTrace.supportingEvidenceCount *
    HYPOTHESIS_RANKING_POLICY.supportingEvidencePoint;

  const conflictingEvidencePenalty =
    evaluation.reasoningTrace.conflictingEvidenceCount *
    HYPOTHESIS_RANKING_POLICY.conflictingEvidencePenalty;

  const missingEvidencePenalty =
    evaluation.reasoningTrace.missingEvidenceCount *
    HYPOTHESIS_RANKING_POLICY.missingEvidencePenalty;

  const confidenceConstraintPenalty =
    evaluation.reasoningTrace.confidenceConstrained
      ? HYPOTHESIS_RANKING_POLICY.confidenceConstraintPenalty
      : 0;

  const totalScore =
    confidenceWeight +
    supportingEvidenceScore -
    conflictingEvidencePenalty -
    missingEvidencePenalty -
    confidenceConstraintPenalty;

  return {
    confidenceWeight,
    supportingEvidenceScore,
    conflictingEvidencePenalty,
    missingEvidencePenalty,
    confidenceConstraintPenalty,

    totalScore,
  };
}

export function rankAcceptedHypothesisEvaluations(
  evaluations: HypothesisCandidateEvaluation[]
): RankedHypothesisEvaluation[] {
  const rankedEvaluations =
    evaluations
      .filter(isAcceptedHypothesisEvaluation)
      .map((evaluation) => {
        const rankingFactors =
          calculateHypothesisRankingFactors(
            evaluation
          );

        return {
          evaluation,
          rankingFactors,
        };
      })
      .sort((left, right) => {
        const scoreDifference =
          right.rankingFactors.totalScore -
          left.rankingFactors.totalScore;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        /*
         * Deterministic tie-breaking:
         *
         * 1. More supporting evidence
         * 2. Less conflicting evidence
         * 3. Less missing evidence
         * 4. Stable hypothesis identifier
         */

        const supportingEvidenceDifference =
          right.evaluation.reasoningTrace
            .supportingEvidenceCount -
          left.evaluation.reasoningTrace
            .supportingEvidenceCount;

        if (supportingEvidenceDifference !== 0) {
          return supportingEvidenceDifference;
        }

        const conflictingEvidenceDifference =
          left.evaluation.reasoningTrace
            .conflictingEvidenceCount -
          right.evaluation.reasoningTrace
            .conflictingEvidenceCount;

        if (conflictingEvidenceDifference !== 0) {
          return conflictingEvidenceDifference;
        }

        const missingEvidenceDifference =
          left.evaluation.reasoningTrace
            .missingEvidenceCount -
          right.evaluation.reasoningTrace
            .missingEvidenceCount;

        if (missingEvidenceDifference !== 0) {
          return missingEvidenceDifference;
        }

        return left.evaluation.hypothesis.id.localeCompare(
          right.evaluation.hypothesis.id
        );
      });

  return rankedEvaluations.map(
    (
      {
        evaluation,
        rankingFactors,
      },
      index
    ) => ({
      rank: index + 1,
      score: rankingFactors.totalScore,

      evaluation,
      rankingFactors,
    })
  );
}
export function selectLeadingInterpretation(
  evaluations: HypothesisCandidateEvaluation[]
): LeadingInterpretation | null {
  const rankedEvaluations =
    rankAcceptedHypothesisEvaluations(
      evaluations
    );

  const leadingRankedEvaluation =
    rankedEvaluations[0];

  if (!leadingRankedEvaluation) {
    return null;
  }

  const {
    rank,
    score,
    evaluation,
    rankingFactors,
  } = leadingRankedEvaluation;

  const {
    hypothesis,
    reasoningTrace,
  } = evaluation;

  return {
    hypothesisId: hypothesis.id,

    title: hypothesis.title,
    rationale: hypothesis.rationale,

    rank,
    score,

    confidence: hypothesis.confidence,

    /*
     * Arrays are copied so downstream consumers cannot
     * accidentally mutate the accepted hypothesis stored
     * inside the evaluation result.
     */
    supportingEvidence: [
      ...hypothesis.supportingEvidence,
    ],

    conflictingEvidence: [
      ...hypothesis.conflictingEvidence,
    ],

    missingEvidence: [
      ...hypothesis.missingEvidence,
    ],

    reasoningTrace: {
      supportingEvidenceCount:
        reasoningTrace.supportingEvidenceCount,

      conflictingEvidenceCount:
        reasoningTrace.conflictingEvidenceCount,

      missingEvidenceCount:
        reasoningTrace.missingEvidenceCount,

      requestedConfidence:
        reasoningTrace.requestedConfidence,

      permittedConfidence:
        reasoningTrace.permittedConfidence,

      confidenceConstrained:
        reasoningTrace.confidenceConstrained,

      notes: [
        ...reasoningTrace.notes,
      ],
    },

    rankingFactors: {
      confidenceWeight:
        rankingFactors.confidenceWeight,

      supportingEvidenceScore:
        rankingFactors.supportingEvidenceScore,

      conflictingEvidencePenalty:
        rankingFactors.conflictingEvidencePenalty,

      missingEvidencePenalty:
        rankingFactors.missingEvidencePenalty,

      confidenceConstraintPenalty:
        rankingFactors.confidenceConstraintPenalty,

      totalScore:
        rankingFactors.totalScore,
    },

    diagnosticClaim: false,
  };
}
export function runHypothesisReasoningPipeline(
  candidates: HypothesisCandidateInput[],
  gate: {
    allowed: boolean;
    reason: string;
  }
): HypothesisReasoningPipelineResult {
  const candidateSetEvaluation =
    evaluateHypothesisCandidateSet(
      candidates,
      gate
    );

  /*
   * Ranking receives only preserved accepted evaluations.
   *
   * Blocked, rejected, and duplicate candidates never reach
   * the ranking or leading-interpretation layers.
   */
  const rankedEvaluations =
    rankAcceptedHypothesisEvaluations(
      candidateSetEvaluation
        .acceptedEvaluations
    );

  const leadingInterpretation =
    selectLeadingInterpretation(
      candidateSetEvaluation
        .acceptedEvaluations
    );

  return {
    candidateSetEvaluation,
    rankedEvaluations,
    leadingInterpretation,
  };
}
export function createEvidenceBackedHypothesis(
  candidate: HypothesisCandidateInput
): EvidenceBackedHypothesis | null {
  return evaluateHypothesisCandidate(
    candidate
  ).hypothesis;
}
export function buildHypothesisCandidate(
  generatedCandidate: GeneratedHypothesisCandidate
): HypothesisCandidateInput {
  const {
    candidate,
  } = generatedCandidate;

  return {
    id:
      normalizeText(candidate.id),

    title:
      normalizeText(candidate.title),

    supportingEvidence: [
      ...candidate.supportingEvidence,
    ],

    conflictingEvidence: [
      ...(candidate.conflictingEvidence ?? []),
    ],

    missingEvidence: [
      ...(candidate.missingEvidence ?? []),
    ],

    rationale:
      normalizeText(candidate.rationale),

    requestedConfidence:
      candidate.requestedConfidence,
  };
}export function buildHypothesisCandidates(
  generatedCandidates:
    GeneratedHypothesisCandidate[]
): HypothesisCandidateInput[] {
  return generatedCandidates.map(
    buildHypothesisCandidate
  );
}
export function runHypothesisGenerationRules(
  rules: HypothesisGenerationRule[],
  context: HypothesisGenerationContext
): HypothesisGenerationResult {
  if (
    !context.readyForHypothesisReasoning ||
    !context.hypothesisGate.allowed
  ) {
    return {
      status: "blocked",

      gateAllowed: false,
      gateReason:
        context.hypothesisGate.reason,

      ruleResults: [],
      generatedCandidates: [],

      executedRuleCount: 0,
      generatedCandidateCount: 0,
    };
  }

  const ruleResults:
    HypothesisGenerationRuleResult[] = [];

  const generatedCandidates:
    GeneratedHypothesisCandidate[] = [];

  for (const rule of rules) {
    const ruleCandidates =
      rule.generate(context);

    /*
     * Copy the returned array before preserving it so a rule
     * cannot later mutate the generation result indirectly.
     */
    const preservedCandidates = [
      ...ruleCandidates,
    ];

    ruleResults.push({
      ruleId:
        normalizeText(rule.id),

      ruleName:
        normalizeText(rule.name),

      generatedCandidateCount:
        preservedCandidates.length,

      generatedCandidates:
        preservedCandidates,
    });

    generatedCandidates.push(
      ...preservedCandidates
    );
  }

  return {
    status: "completed",

    gateAllowed: true,
    gateReason:
      context.hypothesisGate.reason,

    ruleResults,
    generatedCandidates,

    executedRuleCount:
      ruleResults.length,

    generatedCandidateCount:
      generatedCandidates.length,
  };
}
export function composeHypothesisReasoning(
  rules: HypothesisGenerationRule[],
  context: HypothesisGenerationContext
): HypothesisReasoningCompositionResult {
  const generation =
    runHypothesisGenerationRules(
      rules,
      context
    );

  const pipeline =
    runHypothesisReasoningPipeline(
      buildHypothesisCandidates(
        generation.generatedCandidates
      ),
      context.hypothesisGate
    );

  return {
    generation,
    pipeline,
  };
}
function buildHealthFacts(
  input: EvidenceBackedReasoningInput,
  confirmedEvidence: ReasoningEvidence[]
): HealthFacts {

  const readyForReasoning =
    input.symptoms.length > 0 &&
    Boolean(input.onset) &&
    Boolean(input.severity) &&
    input.associatedSymptomsKnown;

  return {
    evidenceCount:
      confirmedEvidence.length,

    symptomCount:
      input.symptoms.length,

    hasSymptoms:
      input.symptoms.length > 0,

    hasOnset:
      Boolean(input.onset),

    hasSeverity:
      Boolean(input.severity),

    hasAssociatedSymptoms:
      input.associatedSymptoms.length > 0,

    hasReportSummary:
      Boolean(input.reportSummary),

    hasReportFindings:
      Boolean(input.reportKeyFindings),

    hasReportRiskLevel:
      Boolean(input.reportRiskLevel),

    readyForReasoning,
  };
}
function buildHypothesisGenerationContext(
  input: EvidenceBackedReasoningInput,
  confirmedEvidence: ReasoningEvidence[],
  hypothesisGate: {
    allowed: boolean;
    reason: string;
  }
):
HypothesisGenerationContext {
  const facts =
    buildHealthFacts(
      input,
      confirmedEvidence
    );

  return {
    facts,

    confirmedEvidence,

    readyForHypothesisReasoning:
      facts.readyForReasoning,

    hypothesisGate,
  };
}
function buildConfirmedEvidence(
  input: EvidenceBackedReasoningInput
): ReasoningEvidence[] {
  const confirmedEvidence: ReasoningEvidence[] = [];

  if (input.symptoms.length > 0) {
    confirmedEvidence.push({
      statement:
        `Reported symptoms: ${input.symptoms.join(", ")}`,
      source: "user",
    });
  }

  if (input.onset) {
    confirmedEvidence.push({
      statement:
        `Reported onset: ${input.onset}`,
      source: "user",
    });
  }

  if (input.severity) {
    confirmedEvidence.push({
      statement:
        `Reported severity: ${input.severity}`,
      source: "user",
    });
  }

  if (input.associatedSymptomsKnown) {
    confirmedEvidence.push({
      statement:
        input.associatedSymptoms.length > 0
          ? `Associated symptoms: ${input.associatedSymptoms.join(", ")}`
          : "No additional associated symptoms were reported.",
      source: "user",
    });
  }

  if (input.reportKeyFindings) {
    confirmedEvidence.push({
      statement:
        `Saved report findings: ${input.reportKeyFindings}`,
      source: "report",
    });
  } else if (input.reportSummary) {
    confirmedEvidence.push({
      statement:
        `Saved report summary: ${input.reportSummary}`,
      source: "report",
    });
  }

  if (input.reportRiskLevel) {
    confirmedEvidence.push({
      statement:
        `Saved report risk level: ${input.reportRiskLevel}`,
      source: "report",
    });
  }

  return normalizeEvidence(
    confirmedEvidence
  );
}

export function buildEvidenceBackedReasoning(
  input: EvidenceBackedReasoningInput
): EvidenceBackedReasoningResult {
  const confirmedEvidence =
    buildConfirmedEvidence(input);

  const facts =
    buildHealthFacts(
      input,
      confirmedEvidence
    );

  const hypothesisGate = {
    allowed:
      facts.readyForReasoning,

    reason:
      facts.readyForReasoning
        ? "Basic clinical evidence is complete. Hypothesis candidates may now be evaluated, but each candidate must independently satisfy the evidence gate."
        : "Hypothesis generation is blocked until the basic clinical evidence requirements are complete.",
  };

  const generationContext =
    buildHypothesisGenerationContext(
      input,
      confirmedEvidence,
      hypothesisGate
    );

  const hypothesisReasoning =
  composeHypothesisReasoning(
    getRegisteredHypothesisGenerators(),
    generationContext
  );

const hypotheses =
  hypothesisReasoning.pipeline
    .candidateSetEvaluation
    .acceptedHypotheses;

const leadingInterpretation =
  hypothesisReasoning.pipeline
    .leadingInterpretation;

  return {
    confirmedEvidence:
      generationContext.confirmedEvidence,

    hypotheses,

    leadingInterpretation,

    uncertainty:
      generationContext
        .readyForHypothesisReasoning
        ? "The basic symptom evidence is complete enough to begin bounded hypothesis reasoning, but the available evidence does not establish a diagnosis."
        : "The available evidence is still incomplete for bounded hypothesis reasoning.",

    readyForHypothesisReasoning:
      generationContext
        .readyForHypothesisReasoning,

    hypothesisGate:
      generationContext.hypothesisGate,
  };
}