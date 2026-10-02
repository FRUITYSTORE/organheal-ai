import type { MedicalMechanism } from "../../lib/medical-motion/contracts/mechanism";
import { MEDICAL_MECHANISMS } from "../../lib/medical-motion/mechanism-definitions";
import { WHOLE_BODY_ANATOMY } from "../../lib/medical-motion/whole-body-anatomy";
import { createWholeBodyAnatomyCatalog } from "../../lib/medical-motion/anatomy-foundation";

/** Contracts only: TEST region identifiers are not real anatomical asset claims. */
export const CROSS_BODY_FIXTURES: readonly MedicalMechanism[] = [
  ["bronchoconstriction", "respiratory", "lungs", "lungs.testAirway", "https://www.nhlbi.nih.gov/health/lungs/body-controls-breathing"],
  ["reduced_filtration", "renal-urinary", "kidneys", "kidneys.testFiltrationRegion", "https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work"],
  ["fat_accumulation_pattern", "hepatic", "liver", "liver.whole", "https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/definition-facts"],
  ["nerve_compression", "neurologic", "brain", "brain.testNeuralRegion", "https://www.ninds.nih.gov/sites/default/files/2025-05/peripheral-neuropathy.pdf"],
].map(([mechanismId, system, organ, structure, source]) => {
  const m = structuredClone(MEDICAL_MECHANISMS.definitions[1]);
  const id = structure as `${string}.${string}`;
  return { ...m, mechanismId, bodySystems: [system], affectedOrgans: [organ],
    requiredAnatomy: { [id]: { representations: ["tissue"], requireVerified: true, completeCoverage: true } },
    optionalAnatomy: [], highlightedAnatomy: [id],
    clinicalTriggers: [{ kind: "verified-report-finding", code: `${mechanismId}-observation`, origin: "verified-record" }],
    requiredEvidence: [{ kind: "verified-report-finding", code: `${mechanismId}-observation`, origin: "verified-record" }],
    visualizationProfile: { ...m.visualizationProfile, primaryStructure: id, secondaryStructures: [], motionIntent: "none" },
    sourceRefs: [source], rationale: "TEST CONTRACT ONLY: illustrative mechanism category; representation, selection rules and anatomy require medical review.",
  } satisfies MedicalMechanism;
});
export const MECHANISM_TEST_CATALOG = createWholeBodyAnatomyCatalog({ ...WHOLE_BODY_ANATOMY,
  structures: [...WHOLE_BODY_ANATOMY.structures, ...CROSS_BODY_FIXTURES.filter(m => !WHOLE_BODY_ANATOMY.structures.some(s => s.id === m.visualizationProfile.primaryStructure))
    .map(m => ({ id: m.visualizationProfile.primaryStructure, organId: m.affectedOrgans[0], canonicalName: "TEST ONLY schema region, no anatomical asset", evidenceRefs: ["TEST ONLY CONTRACT FIXTURE"] }))],
});
