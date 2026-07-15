import {
  HEALTH_INTELLIGENCE_RULES,
} from "../../rules/health-intelligence-rules";

import type {
  HealthEngineContext,
} from "./health-engine-context";

export type HealthMomentumSignalSource =
  | "assessment"
  | "check-in";

export type HealthMomentumSignalDirection =
  | "improving"
  | "stable"
  | "declining";

export type HealthMomentumSignal = {
  source: HealthMomentumSignalSource;
  direction: HealthMomentumSignalDirection;

  latestScore: number;
  previousScore: number;
  delta: number;

  latestAt: string;
  previousAt: string;
};

export type HealthMomentumSignals = {
  assessment: HealthMomentumSignal | null;
  checkIn: HealthMomentumSignal | null;
  comparable: HealthMomentumSignal[];
};

type ComparableScore = {
  score: number;
  createdAt: string;
};

function getSignalDirection(
  delta: number
): HealthMomentumSignalDirection {
  const minimumChange =
    HEALTH_INTELLIGENCE_RULES
      .momentum
      .minimumMeaningfulChange;

  if (delta >= minimumChange) {
    return "improving";
  }

  if (delta <= -minimumChange) {
    return "declining";
  }

  return "stable";
}

function buildSignal(
  source: HealthMomentumSignalSource,
  scores: ComparableScore[]
): HealthMomentumSignal | null {
  const latest =
    scores[0] ?? null;

  const previous =
    scores[1] ?? null;

  if (!latest || !previous) {
    return null;
  }

  const delta =
    latest.score -
    previous.score;

  return {
    source,

    direction:
      getSignalDirection(delta),

    latestScore:
      latest.score,

    previousScore:
      previous.score,

    delta,

    latestAt:
      latest.createdAt,

    previousAt:
      previous.createdAt,
  };
}

export function buildHealthMomentumSignals(
  engineContext: HealthEngineContext
): HealthMomentumSignals {
  const { context } =
    engineContext;

  const assessment =
    buildSignal(
      "assessment",

      context.assessments.map(
        (assessment) => ({
          score:
            assessment.score,

          createdAt:
            assessment.createdAt,
        })
      )
    );

  const checkIn =
    buildSignal(
      "check-in",

      context.checkIns.map(
        (checkIn) => ({
          score:
            checkIn.wellnessScore,

          createdAt:
            checkIn.createdAt,
        })
      )
    );

  const comparable = [
    assessment,
    checkIn,
  ].filter(
    (
      signal
    ): signal is HealthMomentumSignal =>
      signal !== null
  );

  return {
    assessment,
    checkIn,
    comparable,
  };
}