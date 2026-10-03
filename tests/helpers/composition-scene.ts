import { compileMedicalScene, DEFAULT_SCENE_PRESENTATION } from "../../lib/medical-motion/scene-compiler";
import { MEDICAL_MECHANISMS } from "../../lib/medical-motion/mechanism-definitions";
import { createMechanismRegistry } from "../../lib/medical-motion/mechanism-registry";
import { HEART_ORGAN_MODULE } from "../../lib/medical-motion/organs/heart/heart-organ-module";
import { CROSS_BODY_FIXTURES, MECHANISM_TEST_CATALOG } from "./whole-body-mechanism-fixtures";
import { withTestAnatomyReview } from "./anatomy-review-fixture";
import type { PersonalizationSpecification, TimedOverlay } from "../../lib/medical-motion/contracts/personalization";
export const COMPOSITION_MECHANISMS = [MEDICAL_MECHANISMS.definitions[1], ...CROSS_BODY_FIXTURES];
export function compositionScene(index = 0, media: "still" | "video" = "video") {
  const m = COMPOSITION_MECHANISMS[index];
  const module = withTestAnatomyReview({ ...HEART_ORGAN_MODULE, id: m.affectedOrgans[0],
    anatomyRegistry: Object.entries(m.requiredAnatomy).map(([id, r]) => ({ id: id as `${string}.${string}`,
      kind: "organ", representation: r!.representations![0], verification: "verified", availability: "present",
      blenderObject: "TEST_ONLY_NO_GEOMETRY", fidelity: "reference-derived",
      coverage: { verifiedRegions: ["whole"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["TEST_ONLY"] } })) });
  const result = compileMedicalScene({ mechanismId: m.mechanismId, mechanismVersion: m.version },
    { safety: { allowVideo: true, level: "none" }, mode: "development", claim: "possible-mechanism",
      evidence: m.requiredEvidence.map(r => ({ ...r, origin: r.origin ?? "server-intake", assertion: "present", evidenceRef: "TEST_ONLY" })),
      registry: createMechanismRegistry([m], MECHANISM_TEST_CATALOG), catalog: MECHANISM_TEST_CATALOG, getModule: () => module },
    { ...DEFAULT_SCENE_PRESENTATION, renderIntent: media === "still" ? "still" : "short-clip",
      overlayKinds: ["text-value", "subtitle", "chart", "voice-segment", "caption", "risk-band", "educational-label"] });
  if (!result.ok) throw Error(result.reasons.join(" ")); return result.compiled;
}
export const compositionAuthority = { userId: "01234567-89ab-4def-8123-456789abcdef",
  contextId: "11234567-89ab-4def-8123-456789abcdef", baseSha256: "a".repeat(64), duration: 5 };
export function compositionSpecification(): Omit<PersonalizationSpecification, "textOverlays"> & { textOverlays: TimedOverlay[] } {
  return { compositionVersion: "1", baseArtifactId: "21234567-89ab-4def-8123-456789abcdef",
    outputProfile: { aspectRatio: "16:9", policy: "fit", resolution: "720p" }, language: "en",
    textOverlays: [{ slot: "subtitle", start: 0, end: 2, text: "TEST educational caption" }],
    numericOverlays: [], chartOverlays: [], audioSegments: [], dynamicNarrationSlots: [], baseAudio: "silence" };
}
