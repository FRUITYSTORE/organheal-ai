import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHealthIntelligenceContext,
} from "@/lib/health-intelligence/context/health-intelligence-context";

import {
  buildHealthEngineContext,
} from "@/lib/health-intelligence/engines/shared/health-engine-context";

import {
  composeHealthRuntimeModules,
} from "@/lib/health-intelligence/runtime/health-runtime-module-composer";

describe(
  "composeHealthRuntimeModules",
  () => {
    it(
      "builds the complete connected runtime module composition",
      () => {
        const context =
          buildHealthIntelligenceContext({
            userId:
              "composer-test-user",

            language:
              "en",

            audience:
              "patient",

            assessments:
              [],

            checkIns:
              [],

            reports:
              [],

            analyses:
              [],

            hasHealthPlan:
              false,

            hasDoctorBrief:
              false,
          });

        const engineContext =
          buildHealthEngineContext(
            context
          );

        const composition =
          composeHealthRuntimeModules({
            engineContext,
          });

        expect(
          Object.keys(
            composition
          )
        ).toEqual([
          "story",
          "momentum",
          "clinicalConfidence",
          "evidence",
          "nextDecision",
          "decisionImpact",
          "summary",
        ]);

        expect(
          composition.story
        ).toBeDefined();

        expect(
          composition.momentum
        ).toBeDefined();

        expect(
          composition.clinicalConfidence
        ).toBeDefined();

        expect(
          composition.evidence
        ).toBeDefined();

        expect(
          composition.nextDecision
        ).toBeDefined();

        expect(
          composition.decisionImpact
        ).toBeDefined();

        expect(
          composition.summary
        ).toBeDefined();

        expect(
          composition.momentum.status
        ).toBe(
          "insufficient-data"
        );

        expect(
          composition.clinicalConfidence.level
        ).toBe(
          "low"
        );

        expect(
          composition.evidence.strength
        ).toBe(
          "insufficient"
        );

        expect(
          composition.nextDecision.context
            .evidenceStrength
        ).toBe(
          composition.evidence.strength
        );

        expect(
          composition.nextDecision.context
            .confidenceLevel
        ).toBe(
          composition.clinicalConfidence.level
        );

        expect(
          composition.nextDecision.context
            .momentumStatus
        ).toBe(
          composition.momentum.status
        );

        expect(
          composition.decisionImpact.primary
            .actionType
        ).toBe(
          composition.nextDecision.primary.type
        );

        expect(
          composition.decisionImpact.generatedAt
        ).toBe(
          composition.nextDecision.generatedAt
        );

        expect(
          composition.summary.healthPicture
            .headline
        ).toBe(
          composition.story.headline
        );

        expect(
          composition.summary.healthPicture
            .narrative
        ).toBe(
          composition.story.narrative
        );

        expect(
          composition.summary.momentum.status
        ).toBe(
          composition.momentum.status
        );
      }
    );
  }
);