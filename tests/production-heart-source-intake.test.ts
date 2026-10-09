import { expect, it } from "vitest";
import manifest from "../medical-assets/LICENSE_MANIFEST.json";
import { ANATOMY_LICENSES, ANATOMY_SOURCES } from "../lib/medical-motion/anatomy-sources";
import type { AnatomyAssessment, AnatomyProvenance } from "../lib/medical-motion/contracts/anatomy-foundation";

it("locks owner visual roles without transferring source authority or approval", () => {
  const hero = manifest.productionHeartCandidates.find(c => c.id === "HEART_HERO")!;
  const motion = manifest.productionHeartCandidates.find(c => c.id === "HEART_MOTION")!;
  expect(hero.originalSourceVisualDecision).toMatchObject({ decision: "REJECTED_AS_PRODUCTION_HERO_MASTER", retainedUse: "MEDIUM_SHOT_VISUAL_REFERENCE_ONLY" });
  expect(hero.ownerVisualSelection).toMatchObject({ selectedLocalAsset: "realistic-human-heart", sourceFile: "source/Heart.fbx", organHealRole: "HEART_HERO_V1", decision: "ACCEPT_WITH_VISUAL_POLISH", intendedUse: "medium/hero medical explanation shots", preserveOriginalGeometry: true, anatomicalAuthority: false });
  expect(hero.ownerVisualSelection?.sourceIdentityBoundary).toContain("original Pigcraft source metadata and license do not establish");
  expect(motion.ownerVisualSelection).toMatchObject({ selectedLocalAsset: "beating-heart", sourceFile: "source/Beating heart.glb", organHealRole: "HEART_MOTION_V1", decision: "ACCEPT_WITH_VISUAL_POLISH", preserveNativeHeartbeatAndLeafletAnimation: true, inventedDeformationAllowed: false, pathologicalRhythmsClinicallyValidated: false });
  for (const selection of [hero.ownerVisualSelection, motion.ownerVisualSelection]) {
    expect(selection).toMatchObject({ anatomicallyValidated: false, clinicalApprovalStatus: "unreviewed", patientFacing: false, productionApproved: false, provenanceLicenseClearance: "unresolved" });
  }
  expect(manifest.productionHeartCandidates.filter(c => c.ownerAssignedRole).map(c => [c.id, c.ownerAssignedRole])).toEqual([["HEART_REFERENCE", "reference"], ["HEART_INTERNAL", "cutaway/internal"], ["HEART_CORONARY", "coronary reference"]]);
});

it("limits normal heartbeat to the native cycle and requires validated personalization", () => {
  const motion = manifest.productionHeartCandidates.find(c => c.id === "HEART_MOTION")!;
  expect(motion.ownerVisualSelection?.normalHeartbeat).toEqual({ id: "NORMAL_HEARTBEAT_V1", definition: "Native source heartbeat cycle only.", action: "test", sourceFrameRange: [0, 24], sourceAnimationCurvesUnchanged: true, diseaseLabelAloneMayAlterMotion: false, futureRateRhythmPersonalizationRequires: "Validated clinical input/preset." });
  expect(motion.ownerVisualSelection?.excludedLocalMotionReference).toEqual({ sourceFile: "source/s prog heart 31.fbx", retainedUse: "MOTION_REFERENCE_ONLY", textureIssue: "unresolved", repairOrRemapAuthorized: false });
});

it("registers five separate model identities and intended roles", () => {
  expect(manifest.productionHeartCandidates.map(c => [c.id, c.modelUid, c.role])).toEqual([
    ["HEART_REFERENCE", "ae1c46e7f44547b3aea4d79acdb6e6ab", "reference"],
    ["HEART_HERO", "54fa880728d14c11afff78be8721620a", "hero visual candidate"],
    ["HEART_INTERNAL", "21d346f72230432e8ed5fe448b03cca5", "internal/cutaway candidate"],
    ["HEART_CORONARY", "cb63e7714a574984835160530957748b", "coronary candidate"],
    ["HEART_MOTION", "d9845afb1ee64ad094adc96320c67d98", "motion candidate"],
  ]);
  for (const candidate of manifest.productionHeartCandidates) {
    const provenance: AnatomyProvenance = candidate.provenance as AnatomyProvenance;
    const assessment: AnatomyAssessment = candidate.assessment as AnatomyAssessment;
    const source = ANATOMY_SOURCES.find(s => s.id === candidate.id)!;
    expect(source).toMatchObject({ sourceVersion: provenance.sourceVersion, licenseId: provenance.licenseId, upstreamProject: candidate.sourceUrl });
    expect(candidate.sourceUrl).toContain(candidate.modelUid);
    expect(assessment.clinicalApprovalStatus).toBe("unreviewed");
    expect(ANATOMY_SOURCES.filter(s => s.id === candidate.id)).toHaveLength(1);
  }
});

it("keeps unverified licenses, archives and approval fail closed", () => {
  for (const candidate of manifest.productionHeartCandidates) {
    expect(candidate).toMatchObject({ intakeStatus: "INTERNAL-REVIEW", anatomicallyValidated: false, patientFacing: false, geometryMixingAllowed: false, archiveSha256: null, files: [] });
    expect(candidate.provenance.licenseReview.status).toBe("unresolved");
    expect(candidate.assessment.geometryStatus).toBe("not-imported");
    expect(ANATOMY_LICENSES.find(l => l.id === candidate.provenance.licenseId)).toMatchObject({ reviewStatus: "unresolved", commercialCompatibility: "unresolved" });
  }
  expect(manifest.productionHeartCandidates[2].authorUploader).toBe("Haiqa Arif");
  expect(manifest.productionHeartCandidates.map(c => [c.title, c.authorUploader])).toEqual([
    ["Full Patient Heart from CT - with texture", "APIL"],
    ["Anatomically Correct Human Heart", "Pigcraft"],
    ["Human Heart Internal Structure 3D Model", "Haiqa Arif"],
    ["3D Digital Model of Coronary Arteries", "Jeslyn Poo Hwee Ming"],
    ["Beating-heart", "jalmer"],
  ]);
  expect(manifest.productionHeartCandidates.slice(0, 4).map(c => c.uploaderHandle)).toEqual(["apil_tgh", "s8819296", "ansarihaiqaarif", "jeslynpoo"]);
  expect(manifest.productionHeartCandidates[0].organizationContext).toBe("Advanced Perioperative Imaging Lab / Toronto Heart Atlas");
  expect(manifest.productionHeartCandidates[3].supportAttribution).toBe("Department of Physiology, National University of Singapore (NUS)");
  expect(manifest.productionHeartCandidates[4].originalCreator).toBe("Dreamwasabducted");
  for (const candidate of manifest.productionHeartCandidates) {
    expect(candidate.licenseFamily).toBe("CC Attribution");
    expect(ANATOMY_SOURCES.find(s => s.id === candidate.id)!.canonicalName).toBe(candidate.title);
    expect(ANATOMY_LICENSES.find(l => l.id === candidate.provenance.licenseId)!.requiredAttribution.join(" ")).toContain(candidate.authorUploader);
  }
  expect(ANATOMY_LICENSES.find(l => l.id === "HEART_MOTION-license-unresolved")!.requiredAttribution).toContain("Original work: Dreamwasabducted");
  expect(manifest.productionHeartCandidates.slice(0, 4).every(c => c.licenseVersion === "unresolved" && c.licenseUrl === null)).toBe(true);
  expect(manifest.productionHeartCandidates[4]).toMatchObject({ license: "CC BY 4.0", licenseVersion: "4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" });
});
