import type { MedicalMechanism } from "./contracts/mechanism";
import { createMechanismRegistry } from "./mechanism-registry";
import { WHOLE_BODY_ANATOMY } from "./whole-body-anatomy";

const common = {
  version: "1", kind: "explanatory-mechanism", bodySystems: ["cardiovascular"], affectedOrgans: ["heart"],
  optionalAnatomy: [], clinicalTriggers: [{ kind: "assessment-response", code: "clinical-message-provided", origin: "server-intake" }],
  requiredEvidence: [{ kind: "assessment-response", code: "clinical-message-provided", origin: "server-intake" }],
  supportingEvidence: [], contradictoryEvidence: [], contraindications: [], missingEvidenceBehavior: "insufficient-evidence",
  allowedClaims: ["general-physiology", "possible-mechanism", "documented-mechanism"],
  forbiddenClaims: ["diagnosis", "patient-pathology", "risk-as-disease"],
  allowedVisualizations: ["highlight", "camera-focus", "structure-label"],
  forbiddenVisualizations: ["invent-plaque", "invent-tumor", "invent-clot", "invent-scar", "unsupported-pathology", "unvalidated-deformation"],
  effectRequirements: {}, severityModel: { clinicalLevels: ["none", "mild", "moderate", "high", "unknown"], mapping: "no-automatic-visual-mapping" },
  safetyRequirements: { requireSafetyGate: true, noDiagnosisInference: true, noRiskToPathology: true },
  engineeringStatus: "engineering-valid", medicalReviewStatus: "unreviewed", patientFacingStatus: "internal-only",
  medicalReviewEvidenceRefs: [], patientApprovalEvidenceRefs: [],
} as const;
const profile = {
  cameraIntent: "focus-structure", visualEffectIntent: ["highlight", "camera-focus", "structure-label"], motionIntent: "baseline",
  flowIntent: "none", labelIntent: "structure-names", visualEmphasis: "neutral", patientIndependent: true,
} as const;

/** Migration of the existing educational definitions, not new clinical approval.
 * A reported concern permits possible internal education, never physiological diagnosis. */
export const MEDICAL_MECHANISMS = createMechanismRegistry([
  { ...common, mechanismId: "myocardialOxygenDemandSupply",
    requiredAnatomy: {
      "heart.myocardium": { representations: ["tissue"], requireVerified: true, completeCoverage: true, requiredRegions: ["LV", "RV", "septum", "LA", "RA"] },
      "heart.coronary.lad": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
      "heart.coronary.rca": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
      "heart.coronary.lcx": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
    },
    highlightedAnatomy: ["heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"],
    visualizationProfile: { ...profile, primaryStructure: "heart.coronary.lad", secondaryStructures: ["heart.coronary.rca", "heart.coronary.lcx"] },
    rationale: "The heart muscle needs oxygen-rich blood supplied by coronary vessels, and its demand rises with effort.",
    sourceRefs: ["https://www.nhlbi.nih.gov/health/coronary-heart-disease/causes", "lib/symptom-explanation/anatomy-resolver.ts (pre-registry implementation)"],
  },
  { ...common, mechanismId: "leftVentricularPressureLoad",
    requiredAnatomy: {
      "heart.leftVentricle": { representations: ["surface", "tissue"], requireVerified: false },
      "heart.aorta": { representations: ["surface", "tissue", "centerline", "placeholder"], requireVerified: false },
    },
    highlightedAnatomy: ["heart.leftVentricle", "heart.aorta"],
    visualizationProfile: { ...profile, primaryStructure: "heart.leftVentricle", secondaryStructures: ["heart.aorta"] },
    rationale: "Higher arterial pressure means the left ventricle has to push harder to eject blood into the aorta.",
    sourceRefs: ["https://www.nhlbi.nih.gov/files/docs/resources/heart/lat_disc.pdf", "lib/symptom-explanation/anatomy-resolver.ts (pre-registry implementation; medical review pending)"],
  },
] satisfies readonly MedicalMechanism[], WHOLE_BODY_ANATOMY);

/** Current compiler capability vocabulary; the generic registry has no heart restriction. */
export const LEGACY_MECHANISM_BINDINGS = {
  myocardialOxygenDemandSupply: { version: "1", primaryFocus: "heart.coronary" },
  leftVentricularPressureLoad: { version: "1", primaryFocus: "heart.leftVentricle" },
} as const;
