import {
  describe,
  expect,
  it,
} from "vitest";

import {
  detectAssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/detect-assistant-intent";

describe(
  "detectAssistantIntent",
  () => {
    it(
      "classifies an Arabic report action follow-up as next-step",
      () => {
        const result =
          detectAssistantIntent(
            "اعطيني ملخص ماذا يجب أن أعمل بناء على هذا التقرير وماذا تنصح به؟"
          );

        expect(
          result.intent
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "classifies a concise Arabic recommendation question as next-step",
      () => {
        const result =
          detectAssistantIntent(
            "ماذا تنصحني أن أفعل الآن؟"
          );

        expect(
          result.intent
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "classifies an English report action follow-up as next-step",
      () => {
        const result =
          detectAssistantIntent(
            "What should I do based on this report?"
          );

        expect(
          result.intent
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "keeps a clinician-focused question as doctor intent",
      () => {
        const result =
          detectAssistantIntent(
            "ماذا أسأل الطبيب عن هذا التقرير؟"
          );

        expect(
          result.intent
        ).toBe(
          "doctor"
        );
      }
    );

        it(
      "classifies an Arabic diagnostic implication question as cause-reasoning",
      () => {
        const result =
          detectAssistantIntent(
            "هل ارتفاع ALT مع السكر والدهون في تقريري يعني أن لدي كبدًا دهنيًا؟"
          );

        expect(
          result.intent
        ).toBe(
          "cause-reasoning"
        );
      }
    );

    it(
      "classifies an Arabic result implication question as cause-reasoning",
      () => {
        const result =
          detectAssistantIntent(
            "هل هذه النتائج تعني أنني مصاب بمرض معين؟"
          );

        expect(
          result.intent
        ).toBe(
          "cause-reasoning"
        );
      }
    );

    it(
      "classifies an English diagnostic implication question as cause-reasoning",
      () => {
        const result =
          detectAssistantIntent(
            "Does this mean I have fatty liver disease?"
          );

        expect(
          result.intent
        ).toBe(
          "cause-reasoning"
        );
      }
    );

    it(
      "classifies an English report implication question as cause-reasoning",
      () => {
        const result =
          detectAssistantIntent(
            "Could this result indicate a specific disease?"
          );

        expect(
          result.intent
        ).toBe(
          "cause-reasoning"
        );
      }
    );

    it(
      "keeps a plain report interpretation request as report intent",
      () => {
        const result =
          detectAssistantIntent(
            "اشرح لي نتائج هذا التقرير"
          );

        expect(
          result.intent
        ).toBe(
          "report"
        );
      }
    );
  }
);