import type {
  HealthReasoning,
} from "../reasoning/health-reasoning";

import {
  buildHealthMomentumSignals,
  type HealthMomentumSignal,
  type HealthMomentumSignalDirection,
  type HealthMomentumSignalSource,
  type HealthMomentumSignals,
} from "./shared/health-momentum-signals";

import type {
  HealthEngineContext,
} from "./shared/health-engine-context";

export type HealthMomentumStatus =
  | "improving"
  | "stable"
  | "declining"
  | "mixed"
  | "insufficient-data";

export type HealthMomentumExplanationCode =
  | "no-comparable-history"
  | "assessment-improving"
  | "assessment-stable"
  | "assessment-declining"
  | "checkin-improving"
  | "checkin-stable"
  | "checkin-declining"
  | "sources-moving-together"
  | "sources-moving-differently";


export type {
  HealthMomentumSignal,
  HealthMomentumSignalDirection,
  HealthMomentumSignalSource,
} from "./shared/health-momentum-signals";

export type HealthMomentumExplanation = {
  code: HealthMomentumExplanationCode;

  source:
    | HealthMomentumSignalSource
    | "combined";

  values: {
    delta?: number;
    latestScore?: number;
    previousScore?: number;
  };
};

export type HealthMomentumData = {
  status: HealthMomentumStatus;

  averageDelta: number | null;

  signals: HealthMomentumSignal[];

  explanations:
    HealthMomentumExplanation[];

  evidenceMaturity:
    HealthReasoning["evidence"]["maturity"];

  comparableSourceCount: number;

  generatedAt: string;
};

type HealthMomentumAnalysis = {
  status: HealthMomentumStatus;
  averageDelta: number | null;

  explanations:
    HealthMomentumExplanation[];
};

function getMomentumStatus(
  signals: HealthMomentumSignal[]
): HealthMomentumStatus {
  if (signals.length === 0) {
    return "insufficient-data";
  }

  const directions =
    new Set(
      signals.map(
        (signal) =>
          signal.direction
      )
    );

  if (directions.size > 1) {
    return "mixed";
  }

  return signals[0].direction;
}

function getAverageDelta(
  signals: HealthMomentumSignal[]
): number | null {
  if (signals.length === 0) {
    return null;
  }

  const total =
    signals.reduce(
      (sum, signal) =>
        sum + signal.delta,
      0
    );

  return (
    Math.round(
      (total / signals.length) *
        10
    ) / 10
  );
}

function getSignalExplanationCode(
  signal: HealthMomentumSignal
): HealthMomentumExplanationCode {
  if (signal.source === "assessment") {
    if (
      signal.direction ===
      "improving"
    ) {
      return "assessment-improving";
    }

    if (
      signal.direction ===
      "declining"
    ) {
      return "assessment-declining";
    }

    return "assessment-stable";
  }

  if (
    signal.direction ===
    "improving"
  ) {
    return "checkin-improving";
  }

  if (
    signal.direction ===
    "declining"
  ) {
    return "checkin-declining";
  }

  return "checkin-stable";
}

function buildExplanations(
  signals: HealthMomentumSignal[],
  status: HealthMomentumStatus
): HealthMomentumExplanation[] {
  if (signals.length === 0) {
    return [
      {
        code:
          "no-comparable-history",

        source:
          "combined",

        values: {},
      },
    ];
  }

  const explanations =
    signals.map(
      (
        signal
      ): HealthMomentumExplanation => ({
        code:
          getSignalExplanationCode(
            signal
          ),

        source:
          signal.source,

        values: {
          delta:
            signal.delta,

          latestScore:
            signal.latestScore,

          previousScore:
            signal.previousScore,
        },
      })
    );

  if (signals.length >= 2) {
    explanations.push({
      code:
        status === "mixed"
          ? "sources-moving-differently"
          : "sources-moving-together",

      source:
        "combined",

      values: {},
    });
  }

  return explanations;
}

function buildMomentumAnalysis(
  signals: HealthMomentumSignals
): HealthMomentumAnalysis {
  const status =
    getMomentumStatus(
      signals.comparable
    );

  return {
    status,

    averageDelta:
      getAverageDelta(
        signals.comparable
      ),

    explanations:
      buildExplanations(
        signals.comparable,
        status
      ),
  };
}

export function buildHealthMomentum(
  engineContext: HealthEngineContext
): HealthMomentumData {
  const {
    context,
    facts,
    reasoning,
  } = engineContext;

  if (!facts.hasHealthData) {
    return {
      status:
        "insufficient-data",

      averageDelta:
        null,

      signals:
        [],

      explanations: [
        {
          code:
            "no-comparable-history",

          source:
            "combined",

          values: {},
        },
      ],

      evidenceMaturity:
        reasoning.evidence.maturity,

      comparableSourceCount:
        0,

      generatedAt:
        context.generatedAt,
    };
  }

      const signals =
    buildHealthMomentumSignals(
      engineContext
    );
  const analysis =
    buildMomentumAnalysis(
      signals
    );

  return {
    status:
      analysis.status,

    averageDelta:
      analysis.averageDelta,

    signals:
      signals.comparable,

    explanations:
      analysis.explanations,

    evidenceMaturity:
      reasoning.evidence.maturity,

    comparableSourceCount:
      signals.comparable.length,

    generatedAt:
      context.generatedAt,
  };
}