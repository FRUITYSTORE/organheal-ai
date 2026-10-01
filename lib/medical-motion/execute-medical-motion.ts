import "server-only";
import { orchestrateExplanationRender, type ExplanationOrchestrationOptions } from "@/lib/symptom-explanation/orchestrate-explanation-render";
import type { MedicalMotionExecutionInput, MedicalMotionJson } from "@/lib/medical-motion/contracts/execution";

export type MedicalMotionExecutionResult = Awaited<ReturnType<typeof orchestrateExplanationRender>> |
  { status: "failed"; errorCode: "INVALID_EXECUTION_REQUEST" | "INTERNAL_EXECUTION_FAILED"; message: string };

/** Technical decoded-input limits, not clinical/product message limits.
 * UTF-16 units include keys and values. Pre-parse byte enforcement is deferred.
 * Generous text budgets permit normal bilingual clinical input while bounding
 * repeated normalization/validation/hashing work inside one execution. */
export const EXECUTION_INPUT_LIMITS = Object.freeze({
  depth: 64, nodes: 10000, width: 1024,
  stringLength: 65536, keyLength: 1024, totalStringLength: 262144,
});

// Small defensive JSON snapshot: never invoke getters, toJSON or prototype methods.
// Limits apply to the entire decoded request, before clinical/plan execution.
function jsonSnapshot(value: unknown): MedicalMotionJson {
  const ancestors = new Set<object>();
  let nodes = 0;
  let stringUnits = 0;
  function textBudget(text: string, key = false) {
    stringUnits += text.length;
    if (text.length > (key ? EXECUTION_INPUT_LIMITS.keyLength : EXECUTION_INPUT_LIMITS.stringLength) ||
      stringUnits > EXECUTION_INPUT_LIMITS.totalStringLength) throw new Error("Text budget");
  }
  function visit(current: unknown, depth: number): MedicalMotionJson {
    if (++nodes > EXECUTION_INPUT_LIMITS.nodes || depth > EXECUTION_INPUT_LIMITS.depth) throw new Error("JSON bounds");
    if (typeof current === "string") { textBudget(current); return current; }
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "number" && Number.isFinite(current)) return current;
    if (typeof current !== "object" || current === null || ancestors.has(current)) throw new Error("Non JSON data");
    const array = Array.isArray(current);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(current))) throw new Error("Prototype");
    if (array && Object.getPrototypeOf(current) !== Array.prototype) throw new Error("Array prototype");
    const length = array ? Object.getOwnPropertyDescriptor(current, "length")!.value as number : 0;
    if (array && length > EXECUTION_INPUT_LIMITS.width) throw new Error("Array width");
    // Stop ordinary decoded wide objects before descriptor maps/key copies.
    // JS engines may allocate enumeration state; already-decoded input is not
    // a streaming parser. Reflect.ownKeys remains necessary to reject hidden
    // and symbol properties on runtime objects after enumerable preflight.
    const keys: string[] = [];
    for (const key in current) {
      if (!Object.hasOwn(current, key)) continue;
      if (keys.length >= EXECUTION_INPUT_LIMITS.width) throw new Error("Object width");
      textBudget(key, true); keys.push(key);
    }
    const ownKeys = Reflect.ownKeys(current);
    if (ownKeys.length !== keys.length + (array ? 1 : 0) || ownKeys.some((key) => typeof key !== "string")) throw new Error("Hidden property");
    if (array && (keys.length !== length || keys.some((key, i) => key !== String(i)))) throw new Error("Sparse/extended array");
    ancestors.add(current);
    const result: MedicalMotionJson[] | { [key: string]: MedicalMotionJson } = array ? [] : {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)!;
      if (!("value" in descriptor) || !descriptor.enumerable) throw new Error("Descriptor");
      const child = visit(descriptor.value, depth + 1);
      // Define own data properties; __proto__ must never invoke a setter.
      Object.defineProperty(result, key, { value: child, enumerable: true, writable: true, configurable: true });
    }
    ancestors.delete(current);
    return result;
  }
  return visit(value, 0);
}

/** Internal decoded-JSON entry for future durable callers. The second argument
 * must come from server policy, never a job payload: context, asset version,
 * mode, safe filename and timeout. Registry/executable/root stay downstream.
 * Reuses existing triage -> validation -> compiler -> runtime capability ->
 * renderer readiness/recompilation. Readiness still precedes Blender execution.
 * This does not prove clinical appropriateness of a structurally valid plan.
 */
export async function executeMedicalMotionRequest(
  value: unknown, serverOptions: ExplanationOrchestrationOptions,
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
    const result = await orchestrateExplanationRender({ clinical: input.clinical, plan: input.plan, sceneIndex: input.sceneIndex }, { ...serverOptions });
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
