import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assessClinicalUrgency,
} from "@/lib/health-intelligence/engines/clinical-urgency.engine";

import {
  runAssistantOrchestrator,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

describe(
  "Clinical urgency assessment",
  () => {
    it(
      "flags chest pain as an emergency warning signal",
      () => {
        const result =
          assessClinicalUrgency({
            message:
              "I am having chest pain.",
          });

        expect(
          result.level
        ).toBe(
          "emergency"
        );

        expect(
          result.matchedSignalIds
        ).toContain(
          "chest-pain"
        );
      }
    );

    it(
      "flags sudden neurological symptoms as emergency",
      () => {
        const result =
          assessClinicalUrgency({
            message:
              "I suddenly have weakness on one side and trouble speaking.",
          });

        expect(
          result.level
        ).toBe(
          "emergency"
        );
      }
    );

    it(
      "flags worsening abdominal pain for urgent review",
      () => {
        const result =
          assessClinicalUrgency({
            message:
              "My abdominal pain is getting worse.",
          });

        expect(
          result.level
        ).toBe(
          "urgent"
        );
      }
    );

    it(
      "does not escalate a nonspecific fatigue message",
      () => {
        const result =
          assessClinicalUrgency({
            message:
              "I have been feeling tired lately.",
          });

        expect(
          result.level
        ).toBe(
          "none"
        );
      }
    );

    it(
  "does not treat a causal question about chest pain as a current emergency report",
  () => {
    const result =
      assessClinicalUrgency({
        message:
          "Why am I having chest pain?",
      });

    expect(
      result.level
    ).toBe(
      "none"
    );
  }
);

    it(
      "overrides normal assistant conversation for an emergency warning signal",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "I am having chest pain.",

            language:
              "en",

            healthContext:
              null,

            conversation:
              [],
          });

        expect(
          result.response
        ).toContain(
          "emergency"
        );

        expect(
          result.reasoning.mode
        ).toBe(
          "answer"
        );

        expect(
          result.clinicalReasoningState
        ).toBeNull();
      }
    );
  }
);