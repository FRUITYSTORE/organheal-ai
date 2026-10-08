import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MedicalMotionExecutionContextRepository, readReconstructedSourceProfile } from "../execution-context.repository";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { validateExplanationRenderRequest } from "../render/explanation-renderer";
import { compileMedicalScene, DEFAULT_SCENE_PRESENTATION } from "../scene-compiler";
import type { OverlayKind } from "../contracts/medical-scene";
import { MEDICAL_MECHANISMS } from "../mechanism-definitions";
import { getOrganModule } from "../organ-modules";
import { WHOLE_BODY_ANATOMY } from "../whole-body-anatomy";
import { CompositionError } from "./specification";
/** Same clinical and anatomy gate for approval and every replay. */
export async function prepareCompositionScene(client: SupabaseClient, userId: string, contextId: string, sceneIndex: number, mode: "production" | "development", approvedSlots: readonly OverlayKind[] = DEFAULT_SCENE_PRESENTATION.overlayKinds) {
    const contexts = new MedicalMotionExecutionContextRepository(client);
    const context = await contexts.read(contextId, userId);
    const input = await contexts.reconstruct(context.id, userId, sceneIndex);
    // The complete current clinical/anatomy gate precedes any artifact access. AI prose is never authority.
    const prepared = prepareExplanationAuthorization({ clinical: input.clinical, plan: input.plan, sceneIndex: input.sceneIndex },
      { clinicalContextId: context.id, assetVersion: context.assetVersion, mode: mode, outputPath: "render.mp4",
        ...(readReconstructedSourceProfile(input) ? {sourceProfile:readReconstructedSourceProfile(input)} : {}) });
    if (!("ok" in prepared)) throw new CompositionError("COMPOSITION_INVALID");
    const checked = validateExplanationRenderRequest(prepared.authorization, "render.mp4", { mode: mode });
    if (!("ok" in checked) || !checked.request.medicalScene) throw new CompositionError("COMPOSITION_INVALID");
    const issued = readExplanationAuthorization(prepared.authorization)!;
    const original = checked.request.medicalScene;
    const presentation = compileMedicalScene(checked.request.scene.mechanismIdentity, {
      ...issued.compilationContext, registry: MEDICAL_MECHANISMS, getModule: getOrganModule, catalog: WHOLE_BODY_ANATOMY,
      ...(original.scene.profileCameraTargets ? {cameraTargets:original.scene.profileCameraTargets} : {}),
      selections: checked.request.scene.highlight.structures, additionalRequirements: checked.request.scene.anatomyRequirements,
      overview: original.scene.cameraIntent.kind === "organ-overview",
    }, { ...DEFAULT_SCENE_PRESENTATION, renderIntent: original.scene.renderIntent, durationHint: original.scene.durationHint,
      outputProfile: original.scene.outputProfile, overlayKinds: approvedSlots });
    // Overlay declarations are presentation authority, not a change to medical
    // geometry, motion, camera or physical base identity. Never derive them from AI input.
    if (!presentation.ok || presentation.compiled.baseFingerprint !== original.baseFingerprint ||
      presentation.compiled.outputFingerprint !== original.outputFingerprint) throw new CompositionError("COMPOSITION_INVALID");
    return { context, checked, presentation: presentation.compiled };
}
