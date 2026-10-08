import type { MedicalMotionExecutionInput, MedicalMotionJson } from "./execution";

/** Immutable candidate input, never clinical approval or runtime authority. */
export type MedicalMotionContextContent = {
  schemaVersion: MedicalMotionExecutionInput["schemaVersion"];
  executionVersion: "1";
  assetVersion: string;
  clinical: MedicalMotionExecutionInput["clinical"];
  candidatePlan: MedicalMotionJson;
};
export type MedicalMotionExecutionContext = MedicalMotionContextContent & {
  id: string;
  userId: string;
  createdAt: string;
  sourceProfileBindings?: import("./source-profile").SourceProfileBindings;
};
