import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("preserves the rejected prototype bytes and historical gates outside runtime", () => {
  const manifest = JSON.parse(readFileSync("medical-assets/organheal-artery-layered-master-v1.json", "utf8"));
  expect(manifest.masterPath).toBe("medical-assets/archive/legacy-prototypes/organheal-artery-layered-master-v1/master.svg");
  expect(createHash("sha256").update(readFileSync(manifest.masterPath)).digest("hex"))
    .toBe("1374b5dde6c2a8851e76d546ab6bf84f188fcb605c931cf59dddf5860295dd6f");
  expect(manifest.masterSHA256).toBe(manifest.proofs.masterSHA256);
  expect(manifest.archiveDisposition).toMatchObject({ status: "LEGACY_PROTOTYPE_ARCHIVE", runtimeUse: "NOT_RUNTIME", patientUse: "NOT_PATIENT_FACING", supersededBy: "SUPERSEDED_BY_MASTER_VISUAL_LIBRARY" });
  expect(existsSync(manifest.archiveDisposition.originalPath)).toBe(false);
  expect(manifest.runtimeActivated).toBe(false);
  expect(manifest.patientFacing).toBe(false);
  expect(manifest.medicalReviewStatus).toBe("PENDING");
  expect(manifest.qualityGate.finalStatus).toBe("MEDICAL_STRUCTURE_PASS_VISUAL_FAIL");
});
