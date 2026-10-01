import "server-only";
import { prepareExplanationAuthorization, type ExplanationOrchestrationOptions } from "@/lib/symptom-explanation/explanation-authorization";
import { renderExplanationRequest } from "@/lib/medical-motion/render/explanation-renderer";
export type { ExplanationOrchestrationInput, ExplanationOrchestrationOptions } from "@/lib/symptom-explanation/explanation-authorization";

/** The clinical application entry point; preparation issues an opaque capability
 * only after existing triage, plan validation and deterministic compilation. */
export async function orchestrateExplanationRender(value: unknown, options: ExplanationOrchestrationOptions) {
  const prepared = prepareExplanationAuthorization(value, options);
  if (!("ok" in prepared)) return prepared;
  const result = await renderExplanationRequest(prepared.authorization, options.outputPath, {
    mode: options.mode, ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return { ...result, ...prepared.trace, safety: prepared.safety, mechanism: prepared.mechanism };
}
