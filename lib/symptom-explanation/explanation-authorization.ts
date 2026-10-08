import "server-only";
import { createHash } from "node:crypto";
import { evaluateSafetyGate } from "@/lib/symptom-explanation/safety-gate";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";
import { canonicalExplanationJson, compileExplanationScene } from "@/lib/symptom-explanation/compile-explanation-scene";
import type { ExplanationRenderRequest } from "@/lib/medical-motion/contracts/render";
import type { RenderMode } from "@/lib/symptom-explanation/asset-readiness";
import type { SafetyTriageResult, SymptomExplanationErrorCode } from "@/lib/symptom-explanation/contracts";
import { MEDICAL_MECHANISMS, LEGACY_MECHANISM_BINDINGS } from "@/lib/medical-motion/mechanism-definitions";
import { evaluateMechanismCandidate } from "@/lib/medical-motion/mechanism-registry";
import type { ExplanationCompilationContext } from "./compile-explanation-scene";

export type ExplanationOrchestrationInput = {
  clinical: { message: string; language: "en" | "ar" };
  /** Candidate from the planning layer; never accepted as already validated. */
  plan: unknown;
  sceneIndex: number;
};
export type ExplanationOrchestrationOptions = {
  /** Server-issued selection only; never supplied in the clinical payload. */
  sourceProfile?: import("@/lib/medical-motion/contracts/source-profile").SourceProfileSelection;
  /** Opaque server-owned context identity, not a patient name or raw text. */
  clinicalContextId: string;
  assetVersion: string;
  mode: RenderMode;
  outputPath: string;
  timeoutMs?: number;
};
type Trace = { clinicalContextId: string; safetySignature?: string; orchestrationId?: string };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hash = (value: unknown) => createHash("sha256").update(canonicalExplanationJson(value)).digest("hex");
const fail = (errorCode: SymptomExplanationErrorCode, message: string, trace: Trace, safety?: SafetyTriageResult) =>
  ({ status: "failed" as const, errorCode, message, ...trace, ...(safety ? { safety } : {}) });

/** Server application entry point for clinical explanation rendering.
 * Reuses the existing policy, validator, compiler and readiness/render boundary.
 * Lower-level render APIs remain internal primitives, not clinical endpoints.
 * Context ids identify a caller-owned request; they do not authenticate triage. */
export function prepareExplanationAuthorization(value: unknown, options: ExplanationOrchestrationOptions) {
  const trace: Trace = { clinicalContextId: options?.clinicalContextId };
  if (!record(value) || !record(value.clinical) || typeof value.clinical.message !== "string" ||
      !value.clinical.message.trim() || !["en", "ar"].includes(value.clinical.language as string)) {
    return fail("CLINICAL_EXPLANATION_FAILED", "A nonempty clinical message and supported language are required.", trace);
  }
  // No supplied safety decision, scene or plan can prevent this assessment.
  const safety = evaluateSafetyGate(value.clinical.message, value.clinical.language as "en" | "ar");
  if (!record(safety) || !((safety.allowVideo === true && safety.level === "none") ||
      (safety.allowVideo === false && (safety.level === "urgent" || safety.level === "emergency") &&
        typeof safety.response === "string" && safety.response.trim() && Array.isArray(safety.matchedSignalIds) &&
        safety.matchedSignalIds.length > 0 && safety.matchedSignalIds.every((id) => typeof id === "string" && id.trim())))) {
    return fail("CLINICAL_EXPLANATION_FAILED", "The server safety decision is invalid.", trace);
  }
  trace.safetySignature = hash(safety);
  if (!safety.allowVideo) return fail("UNSAFE_FOR_VIDEO_FIRST", safety.response!, trace, safety);
  if (Object.keys(value).some((key) => !["clinical", "plan", "sceneIndex"].includes(key)) ||
      Object.keys(value.clinical).some((key) => !["message", "language"].includes(key))) {
    return fail("CLINICAL_EXPLANATION_FAILED", "Unsupported clinical request fields; supplied safety or scenes are not authoritative.", trace, safety);
  }
  if (!options || typeof options.clinicalContextId !== "string" || !options.clinicalContextId.trim() ||
      !["development", "production"].includes(options.mode) || typeof options.outputPath !== "string" || !options.outputPath.trim()) {
    return fail("CLINICAL_EXPLANATION_FAILED", "Explicit server context, output and render mode are required.", trace, safety);
  }
  const validation = validateVideoExplanationPlan(value.plan);
  if (!validation.ok) return fail(validation.errorCode, validation.issues.join(" "), trace, safety);
  // Only the server intake is evidence here. Plan findings/AI confidence are
  // not verified records. Production approval is enforced with anatomy readiness.
  const mechanism = validation.plan.mechanism;
  const eligible = evaluateMechanismCandidate(MEDICAL_MECHANISMS,
    { mechanismId: mechanism.id, mechanismVersion: mechanism.version ?? LEGACY_MECHANISM_BINDINGS[mechanism.id].version },
    { safety, mode: "development", claim: mechanism.evidence === "documented" ? "documented-mechanism" : "possible-mechanism",
      evidence: [{ kind: "assessment-response", code: "clinical-message-provided", origin: "server-intake", assertion: "present", evidenceRef: "server-clinical-input" }] });
  if (eligible.status !== "eligible") return fail("CLINICAL_EXPLANATION_FAILED", eligible.reasons.join(" "), trace, safety);
  const compilationContext: ExplanationCompilationContext = { safety, mode: options.mode,
    ...(options.sourceProfile !== undefined ? { sourceProfile: options.sourceProfile } : {}),
    claim: mechanism.evidence === "documented" ? "documented-mechanism" : "possible-mechanism",
    evidence: [{ kind: "assessment-response", code: "clinical-message-provided", origin: "server-intake", assertion: "present", evidenceRef: "server-clinical-input" }] };
  const compiled = compileExplanationScene(validation.plan, {
    sceneIndex: value.sceneIndex as number, assetVersion: options.assetVersion,
  }, compilationContext);
  if (!compiled.ok) return fail(compiled.errorCode, compiled.issues.join(" "), trace, safety);
  trace.orchestrationId = hash({ clinicalContextId: trace.clinicalContextId,
    safetySignature: trace.safetySignature, requestId: compiled.request.requestId });
  const authorization = Object.freeze(Object.create(null)) as object;
  authorizations.set(authorization, { request: structuredClone(compiled.request), options: { ...options }, compilationContext: copyCompilationContext(compilationContext) });
  return { ok: true as const, authorization, trace, safety, mechanism: compiled.request.explanationPlan.mechanism };
}

// Only runtime identity authorizes. Copies, JSON, signatures and type assertions cannot mint it.
const authorizations = new WeakMap<object, { request: ExplanationRenderRequest; options: ExplanationOrchestrationOptions; compilationContext: ExplanationCompilationContext }>();
function copyCompilationContext(context: ExplanationCompilationContext): ExplanationCompilationContext {
  const {sourceProfile,...json} = context;
  return {...structuredClone(json),...(sourceProfile !== undefined ? {sourceProfile} : {})};
}
export function readExplanationAuthorization(value: unknown) {
  if (value === null || typeof value !== "object") return null;
  const authorized = authorizations.get(value);
  if (!authorized) return null;
  const {sourceProfile,...jsonOptions} = authorized.options;
  const copy = {request:structuredClone(authorized.request),options:{...structuredClone(jsonOptions),...(sourceProfile !== undefined ? {sourceProfile} : {})},compilationContext:copyCompilationContext(authorized.compilationContext)};
  // Detached public data; only the opaque server selection retains runtime identity.
  return copy;
}
