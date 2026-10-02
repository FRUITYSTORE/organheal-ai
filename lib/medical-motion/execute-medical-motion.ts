import "server-only";
import { orchestrateExplanationRender, type ExplanationOrchestrationOptions } from "@/lib/symptom-explanation/orchestrate-explanation-render";
import type { MedicalMotionExecutionInput } from "@/lib/medical-motion/contracts/execution";
import { jsonSnapshot } from "@/lib/medical-motion/validation/json-snapshot";
export { EXECUTION_INPUT_LIMITS } from "@/lib/medical-motion/validation/json-snapshot";

export type MedicalMotionExecutionResult = Awaited<ReturnType<typeof orchestrateExplanationRender>> |
  { status: "failed"; errorCode: "INVALID_EXECUTION_REQUEST" | "INTERNAL_EXECUTION_FAILED"; message: string };

/** Internal decoded-JSON entry for future durable callers. The second argument
 * must come from server policy, never a job payload: context, asset version,
 * mode, safe filename and timeout. Registry/executable/root stay downstream.
 * Optional third-argument control is trusted and never part of clinical JSON,
 * authorization snapshots or signatures; it reuses the renderer's contract.
 * Reuses existing triage -> validation -> compiler -> runtime capability ->
 * renderer readiness/recompilation. Readiness still precedes Blender execution.
 * This does not prove clinical appropriateness of a structurally valid plan.
 */
export async function executeMedicalMotionRequest(
  value: unknown, serverOptions: ExplanationOrchestrationOptions,
  control: Parameters<typeof orchestrateExplanationRender>[2] = {},
): Promise<MedicalMotionExecutionResult> {
  let input: MedicalMotionExecutionInput;
  try {
    const snapshot = jsonSnapshot(value);
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("Object required");
    if (Object.keys(snapshot).length !== 4 || Object.keys(snapshot).some((key) =>
      !["schemaVersion", "clinical", "plan", "sceneIndex"].includes(key)) || snapshot.schemaVersion !== "1") throw new Error("Schema");
    const clinical = snapshot.clinical;
    if (!clinical || typeof clinical !== "object" || Array.isArray(clinical) ||
      Object.keys(clinical).length !== 2 || Object.keys(clinical).some((key) => !["message", "language"].includes(key)) ||
      typeof clinical.message !== "string" || !clinical.message.trim() || !["en", "ar"].includes(clinical.language as string) ||
      typeof snapshot.sceneIndex !== "number" || !Number.isSafeInteger(snapshot.sceneIndex) || snapshot.sceneIndex < 0) throw new Error("Fields");
    input = snapshot as MedicalMotionExecutionInput;
  } catch {
    // Constant diagnostic: do not echo clinical data or supplied trust/path claims.
    return { status: "failed", errorCode: "INVALID_EXECUTION_REQUEST", message: "Invalid version 1 JSON execution request." };
  }
  try {
    const result = await orchestrateExplanationRender({ clinical: input.clinical, plan: input.plan, sceneIndex: input.sceneIndex }, { ...serverOptions }, control);
    // Operational control stays outside the JSON snapshot and clinical identity.
    // Do not return a completed local artifact after trusted cancellation.
    if (result.status === "completed" && control?.signal?.aborted) {
      const { outputPath: _artifact, durationSeconds: _duration, ...trace } = result;
      return { ...trace, status: "failed", errorCode: "RENDER_CANCELLED", message: "Render execution was cancelled." };
    }
    if (result.status !== "failed") return result;
    // Local validators retain their diagnostics. Durable callers receive only
    // trusted codes/static messages, never candidate-plan values or process text.
    // Safety Gate guidance is server-authored and intentionally user-facing.
    const guidance = "safety" in result && result.safety && !result.safety.allowVideo
      ? result.safety.response : null;
    return { ...result, message: guidance || `Medical Motion execution failed (${result.errorCode}).` };
  } catch {
    // Not a malformed-request classification: unexpected defects remain
    // distinguishable for operators, without echoing exception text/PHI.
    return { status: "failed", errorCode: "INTERNAL_EXECUTION_FAILED", message: "Medical Motion execution encountered an unexpected internal failure." };
  }
}
