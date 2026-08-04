import {
  buildHealthStory,
} from "@/lib/health-intelligence/engines/health-story.engine";

import {
  buildHealthMomentum,
} from "@/lib/health-intelligence/engines/health-momentum.engine";

import {
  buildClinicalConfidence,
} from "@/lib/health-intelligence/engines/clinical-confidence.engine";

import {
  buildEvidenceIntelligence,
} from "@/lib/health-intelligence/engines/evidence-intelligence.engine";

import {
  buildNextDecision,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import {
  buildDecisionImpact,
} from "@/lib/health-intelligence/engines/decision-impact.engine";

import {
  buildHealthIntelligenceSummary,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";

export type HealthRuntimeModuleComposerInput = {
  engineContext:
    Parameters<
      typeof buildHealthStory
    >[0];
};

export type HealthRuntimeModuleComposition = {
  story:
    ReturnType<
      typeof buildHealthStory
    >;

  momentum:
    ReturnType<
      typeof buildHealthMomentum
    >;

  clinicalConfidence:
    ReturnType<
      typeof buildClinicalConfidence
    >;

  evidence:
    ReturnType<
      typeof buildEvidenceIntelligence
    >;

  nextDecision:
    ReturnType<
      typeof buildNextDecision
    >;

  decisionImpact:
    ReturnType<
      typeof buildDecisionImpact
    >;

  summary:
    ReturnType<
      typeof buildHealthIntelligenceSummary
    >;
};

export function composeHealthRuntimeModules({
  engineContext,
}: HealthRuntimeModuleComposerInput): HealthRuntimeModuleComposition {
  const story =
    buildHealthStory(
      engineContext
    );

  const momentum =
    buildHealthMomentum(
      engineContext
    );

  const clinicalConfidence =
    buildClinicalConfidence(
      engineContext
    );

  const evidence =
    buildEvidenceIntelligence(
      engineContext
    );

  const nextDecision =
    buildNextDecision({
      engineContext,
      evidence,
      clinicalConfidence,
      momentum,
    });

  const decisionImpact =
    buildDecisionImpact(
      nextDecision
    );

  const summary =
    buildHealthIntelligenceSummary({
      story,
      momentum,
      clinicalConfidence,
      evidence,
      nextDecision,
      decisionImpact,
    });

  return {
    story,
    momentum,
    clinicalConfidence,
    evidence,
    nextDecision,
    decisionImpact,
    summary,
  };
}