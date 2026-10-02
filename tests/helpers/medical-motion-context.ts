import { getMechanismAnatomy } from "@/lib/symptom-explanation/anatomy-resolver";
import { HEART_ASSET_VERSION } from "@/lib/medical-motion/organs/heart/heart-organ-module";
import type { MedicalMotionContextContent } from "@/lib/medical-motion/contracts/execution-context";
import type { MechanismId } from "@/lib/symptom-explanation/contracts";

/** Synthetic test input only; never production clinical data. */
export function contextContent(mechanism: MechanismId = "leftVentricularPressureLoad"): MedicalMotionContextContent {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return structuredClone({ schemaVersion: "1", executionVersion: "1", assetVersion: HEART_ASSET_VERSION,
    clinical: { message: "I feel tired lately.", language: "en" },
    candidatePlan: { planVersion: "1", organ, topic: "normal physiology", safety: { level: "none" },
      mechanism: { id: mechanism, evidence: "possible" }, anatomy: { primaryFocus, structures: [...structures], requirements },
      documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] },
  }) as unknown as MedicalMotionContextContent;
}
