import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot, EXECUTION_INPUT_LIMITS } from "./validation/json-snapshot";
import type { MedicalMotionExecutionInput, MedicalMotionJson } from "./contracts/execution";
import type { MedicalMotionContextContent, MedicalMotionExecutionContext } from "./contracts/execution-context";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";
import { getOrganModule } from "./organ-modules";
import { canonicalExplanationJson } from "@/lib/symptom-explanation/compile-explanation-scene";

type RecordJson = { [key: string]: MedicalMotionJson };
const CONTENT_KEYS = ["schemaVersion", "executionVersion", "assetVersion", "clinical", "candidatePlan"];
// Reserve room for database identity/timestamp and reconstruction envelopes.
// A context accepted for storage must still fit the existing decoded-input
// bounds after retrieval; keep the single shared traversal implementation.
const CONTEXT_LIMITS = { ...EXECUTION_INPUT_LIMITS, nodes: EXECUTION_INPUT_LIMITS.nodes - 32,
  depth: EXECUTION_INPUT_LIMITS.depth - 2, totalStringLength: EXECUTION_INPUT_LIMITS.totalStringLength - 512 };
function fields(value: MedicalMotionJson, keys: string[]): value is RecordJson {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
}

export class ExecutionContextError extends Error {
  constructor(readonly code: "INVALID_CONTEXT" | "CONTEXT_NOT_FOUND" | "CONTEXT_VERSION_UNAVAILABLE" |
    "CONTEXT_CREATE_FAILED" | "CONTEXT_READ_FAILED" | "INVALID_CONTEXT_RESULT") {
    super(code);
    this.name = "ExecutionContextError";
  }
}
function invalid(): never { throw new ExecutionContextError("INVALID_CONTEXT"); }
export function validateMedicalMotionContextContent(value: unknown): MedicalMotionContextContent {
  let snapshot: MedicalMotionJson;
  try { snapshot = jsonSnapshot(value, CONTEXT_LIMITS); } catch { return invalid(); }
  if (!fields(snapshot, CONTENT_KEYS) || snapshot.schemaVersion !== "1" || snapshot.executionVersion !== "1" ||
    typeof snapshot.assetVersion !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(snapshot.assetVersion) ||
    !fields(snapshot.clinical, ["message", "language"]) ||
    typeof snapshot.clinical.message !== "string" || !snapshot.clinical.message.trim() ||
    snapshot.clinical.message.includes("\u0000") || !["en", "ar"].includes(snapshot.clinical.language as string)) return invalid();
  // Validate but preserve the exact submitted candidate; do not persist a
  // normalized plan or runtime authority. Execution validates it again.
  try { if (!validateVideoExplanationPlan(snapshot.candidatePlan).ok) return invalid(); }
  catch { return invalid(); }
  return snapshot as MedicalMotionContextContent;
}
const content = validateMedicalMotionContextContent;
function identity(value: unknown): string {
  if (!isUuid(value)) return invalid();
  return value.toLowerCase();
}
function singleRow(data: unknown): unknown {
  try {
    // Inspect the RPC envelope without invoking a supplied index getter.
    if (!Array.isArray(data) || Object.getPrototypeOf(data) !== Array.prototype || data.length > 1 ||
      Reflect.ownKeys(data).length !== data.length + 1) {
      throw new ExecutionContextError("INVALID_CONTEXT_RESULT");
    }
    if (data.length === 0) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(data, "0");
    if (!descriptor?.enumerable || !("value" in descriptor) || descriptor.value === undefined) {
      throw new ExecutionContextError("INVALID_CONTEXT_RESULT");
    }
    return descriptor.value;
  } catch { throw new ExecutionContextError("INVALID_CONTEXT_RESULT"); }
}
function row(value: unknown, owner: string, expectedId?: string): MedicalMotionExecutionContext {
  try {
    const snapshot = jsonSnapshot(value);
    if (!fields(snapshot, ["id", "user_id", "schema_version", "execution_version", "asset_version",
      "clinical_message", "clinical_language", "candidate_plan", "created_at"]) ||
      !isUuid(snapshot.id) || !isUuid(snapshot.user_id) || snapshot.user_id.toLowerCase() !== owner ||
      (expectedId && snapshot.id.toLowerCase() !== expectedId) || typeof snapshot.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(snapshot.created_at) ||
      !Number.isFinite(Date.parse(snapshot.created_at))) throw new Error();
    const validated = content({ schemaVersion: snapshot.schema_version, executionVersion: snapshot.execution_version,
      assetVersion: snapshot.asset_version, clinical: { message: snapshot.clinical_message, language: snapshot.clinical_language },
      candidatePlan: snapshot.candidate_plan });
    return { ...validated, id: snapshot.id.toLowerCase(), userId: owner, createdAt: snapshot.created_at };
  } catch { throw new ExecutionContextError("INVALID_CONTEXT_RESULT"); }
}

/** Trusted authenticated identity is a separate server argument, never body
 * authority. No client API, logging, retries, latest-source loads or queue wiring.
 * A lost create response has unknown commit state; do not automatically retry. */
export class MedicalMotionExecutionContextRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async create(trustedUserId: string, value: unknown): Promise<MedicalMotionExecutionContext> {
    const owner = identity(trustedUserId), input = content(value);
    let data: unknown;
    try {
      const response = await this.client.rpc("create_medical_motion_execution_context", {
        p_user_id: owner, p_schema_version: input.schemaVersion, p_execution_version: input.executionVersion,
        p_asset_version: input.assetVersion, p_clinical_message: input.clinical.message,
        p_clinical_language: input.clinical.language, p_candidate_plan: input.candidatePlan,
      });
      if (response.error) throw new Error();
      data = response.data;
    } catch { throw new ExecutionContextError("CONTEXT_CREATE_FAILED"); }
    const result = row(singleRow(data), owner);
    // Verify the returned snapshot matches submitted content. JSONB can reorder
    // keys; compare canonical JSON data rather than serialized key order.
    if (!sameContent(input, result)) throw new ExecutionContextError("INVALID_CONTEXT_RESULT");
    return result;
  }

  async read(executionContextId: string, expectedUserId: string): Promise<MedicalMotionExecutionContext> {
    const id = identity(executionContextId), owner = identity(expectedUserId);
    let data: unknown;
    try {
      const response = await this.client.rpc("read_medical_motion_execution_context", { p_context_id: id, p_user_id: owner });
      if (response.error) throw new Error();
      data = response.data;
    } catch { throw new ExecutionContextError("CONTEXT_READ_FAILED"); }
    const value = singleRow(data);
    if (value === undefined) throw new ExecutionContextError("CONTEXT_NOT_FOUND");
    return row(value, owner, id);
  }

  async reconstruct(executionContextId: string, expectedUserId: string, sceneIndex: number): Promise<MedicalMotionExecutionInput> {
    if (!Number.isSafeInteger(sceneIndex) || sceneIndex < 0) return invalid();
    const context = await this.read(executionContextId, expectedUserId);
    const plan = validateVideoExplanationPlan(context.candidatePlan);
    if (!plan.ok) return invalid();
    // The recorded version must still be available. No substitution with the
    // newest asset; no assertion of suitability or medically verified anatomy.
    if (getOrganModule(plan.plan.organ)?.assetVersion !== context.assetVersion) {
      throw new ExecutionContextError("CONTEXT_VERSION_UNAVAILABLE");
    }
    return { schemaVersion: context.schemaVersion, clinical: context.clinical, plan: context.candidatePlan, sceneIndex };
  }
}

function sameContent(a: MedicalMotionContextContent, b: MedicalMotionContextContent): boolean {
  return a.schemaVersion === b.schemaVersion && a.executionVersion === b.executionVersion &&
    a.assetVersion === b.assetVersion && a.clinical.message === b.clinical.message &&
    a.clinical.language === b.clinical.language && canonicalExplanationJson(a.candidatePlan) === canonicalExplanationJson(b.candidatePlan);
}
