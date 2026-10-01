/** Decoded JSON data only. No serialized value carries execution authority. */
export type MedicalMotionJson = null | boolean | number | string |
  MedicalMotionJson[] | { [key: string]: MedicalMotionJson };

export type MedicalMotionExecutionInput = {
  schemaVersion: "1";
  clinical: { message: string; language: "en" | "ar" };
  /** Untrusted candidate; authoritative plan validation runs inside execution. */
  plan: MedicalMotionJson;
  sceneIndex: number;
};
