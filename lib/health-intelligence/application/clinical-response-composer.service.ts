import { buildClinicalNarrative } from "@/lib/health-intelligence/application/clinical-narrative.service";

import type { ClinicalConfidenceCalibrationResult } from "@/lib/health-intelligence/engines/clinical-confidence-calibration.engine";

import type { ClinicalConflictResolutionResult } from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import { buildClinicalDecisionTrace } from "@/lib/health-intelligence/engines/clinical-decision-trace.engine";

import type { ClinicalHypothesisRankingResult } from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type { ClinicalHypothesisEvidence } from "@/lib/health-intelligence/models/clinical-hypothesis";

export type ClinicalResponseComposerLanguage = "en" | "ar";

export type ClinicalResponseComposerInput = {
  language: ClinicalResponseComposerLanguage;

  ranking: ClinicalHypothesisRankingResult;

  conflictResolution: ClinicalConflictResolutionResult;

  confidenceCalibration: ClinicalConfidenceCalibrationResult;
};

export type ClinicalResponseEvidenceItem = ClinicalHypothesisEvidence;

export type ClinicalResponseComposition = {
  available: boolean;

  hypothesisId: string | null;

  title: string | null;

  summary: string | null;

  supportingEvidence: ClinicalResponseEvidenceItem[];

  contradictingEvidence: ClinicalResponseEvidenceItem[];

  contextualEvidence: ClinicalResponseEvidenceItem[];

  missingEvidence: string[];

  confidence: string | null;

  confidenceExplanation: string | null;

  conflictLevel: string | null;

  requiresClarification: boolean;

  requiresAdditionalEvidence: boolean;

  requiresClinicalReview: boolean;

  interpretationBoundary: string | null;

  response: string | null;

  reason: string;

  generatedAt: string;
};

function createUnavailableComposition({
  hypothesisId = null,
  reason,
  generatedAt,
}: {
  hypothesisId?: string | null;

  reason: string;

  generatedAt: string;
}): ClinicalResponseComposition {
  return {
    available: false,

    hypothesisId,

    title: null,

    summary: null,

    supportingEvidence: [],

    contradictingEvidence: [],

    contextualEvidence: [],

    missingEvidence: [],

    confidence: null,

    confidenceExplanation: null,

    conflictLevel: null,

    requiresClarification: false,

    requiresAdditionalEvidence: false,

    requiresClinicalReview: false,

    interpretationBoundary: null,

    response: null,

    reason,

    generatedAt,
  };
}

export function composeClinicalResponse({
  language,
  ranking,
  conflictResolution,
  confidenceCalibration,
}: ClinicalResponseComposerInput): ClinicalResponseComposition {
  const generatedAt = new Date().toISOString();

  const decisionTrace = buildClinicalDecisionTrace({
    ranking,

    conflictResolution,

    confidenceCalibration,
  });

  if (!decisionTrace.available || !decisionTrace.hypothesisId) {
    return createUnavailableComposition({
      hypothesisId: decisionTrace.hypothesisId,

      reason: decisionTrace.traceReason,

      generatedAt,
    });
  }

  const narrative = buildClinicalNarrative({
    audience: "assistant",

    language,

    decisionTrace,
  });

  if (!narrative.available || !narrative.narrative) {
    return createUnavailableComposition({
      hypothesisId: decisionTrace.hypothesisId,

      reason: narrative.reason,

      generatedAt,
    });
  }

  return {
    available: true,

    hypothesisId: decisionTrace.hypothesisId,

    title: decisionTrace.hypothesisTitle,

    summary: decisionTrace.hypothesisDescription,

    supportingEvidence: [...decisionTrace.supportingEvidence],

    contradictingEvidence: [...decisionTrace.contradictingEvidence],

    contextualEvidence: [...decisionTrace.contextualEvidence],

    missingEvidence: [...decisionTrace.missingEvidence],

    confidence: decisionTrace.calibratedConfidence,

    confidenceExplanation: decisionTrace.confidenceReason,

    conflictLevel: decisionTrace.conflictLevel,

    requiresClarification: decisionTrace.requiresClarification,

    requiresAdditionalEvidence: decisionTrace.requiresAdditionalEvidence,

    requiresClinicalReview: decisionTrace.requiresClinicalReview,

    interpretationBoundary: decisionTrace.interpretationBoundary,

    response: narrative.narrative,

    reason:
      "The clinical response composer coordinated the existing decision trace and assistant narrative without duplicating evidence, ranking, conflict, confidence, or narrative-generation logic.",

    generatedAt,
  };
}
