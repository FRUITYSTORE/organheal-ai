import type { MedicalMotionContextContent } from "./execution-context";

/** Reference-only candidate work; no clinical content or execution authority. */
export type MedicalMotionJobPayload = {
  schemaVersion: MedicalMotionContextContent["schemaVersion"];
  executionContextId: string;
  executionVersion: MedicalMotionContextContent["executionVersion"];
  sceneIndex: number;
};
export const MAX_MEDICAL_MOTION_SCENE_INDEX = 1023;
