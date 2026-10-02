import type { MedicalMechanism } from "./contracts/mechanism";
import type { AnatomyStructureId } from "./contracts/anatomy";
import type { OrganModule } from "./contracts/organ-module";
import type { WholeBodyAnatomyCatalog } from "./contracts/anatomy-foundation";
import { checkAssetReadiness, type RenderMode } from "../symptom-explanation/asset-readiness";
import { getOrganModule } from "./organ-modules";
import { WHOLE_BODY_ANATOMY } from "./whole-body-anatomy";
import { isRegisteredMedicalMechanism, patientMechanismApproved } from "./mechanism-registry";

/** Required anatomy is authoritative. Optional anatomy is checked only when selected.
 * This checks suitability; it neither constructs scenes nor grants authorization. */
export function checkMechanismAnatomy(m: MedicalMechanism, mode: RenderMode,
  selections: readonly AnatomyStructureId[] = [], getModule: (organ: string) => OrganModule | null = getOrganModule,
  catalog: WholeBodyAnatomyCatalog = WHOLE_BODY_ANATOMY) {
  if (!isRegisteredMedicalMechanism(m) || !["development", "production"].includes(mode)) return { ok: false as const, details: ["A registered mechanism and explicit render mode are required."] };
  if (m.engineeringStatus !== "engineering-valid" || m.medicalReviewStatus === "rejected" || m.patientFacingStatus === "rejected") return { ok: false as const, details: ["Mechanism review blocks use."] };
  const allowed = [...Object.keys(m.requiredAnatomy), ...m.optionalAnatomy];
  if (selections.some(id => !allowed.includes(id))) return { ok: false as const, details: ["Unregistered anatomy selection; no substitution permitted."] };
  const ids = [...new Set([...Object.keys(m.requiredAnatomy), ...selections])];
  for (const organ of m.affectedOrgans) {
    const requirements = Object.fromEntries(Object.entries(m.requiredAnatomy).filter(([id]) => id.startsWith(`${organ}.`)));
    const highlights = selections.filter(id => id.startsWith(`${organ}.`));
    if (!ids.some(id => id.startsWith(`${organ}.`))) continue;
    const readiness = checkAssetReadiness(organ, highlights, mode, getModule, requirements, catalog);
    if (!readiness.ok) return readiness;
  }
  if (mode === "production" && !patientMechanismApproved(m)) return { ok: false as const, details: ["Mechanism is not patient-approved."] };
  return { ok: true as const };
}
