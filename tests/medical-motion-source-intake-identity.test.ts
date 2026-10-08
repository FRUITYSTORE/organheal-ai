import { expect, it } from "vitest";
import manifest from "../medical-assets/LICENSE_MANIFEST.json";
import { ANATOMY_LICENSES, ANATOMY_SOURCES } from "../lib/medical-motion/anatomy-sources";
import type { AnatomyAssessment, AnatomyProvenance } from "../lib/medical-motion/contracts/anatomy-foundation";

it("pins the official BodyParts3D 4.0 archive under its existing source identity", () => {
  const candidate = manifest.candidates[0];
  expect(candidate.provenance).toMatchObject({ sourceId: "bodyparts3d-current-archive", sourceVersion: "archive-4.0-license-2025-02-27", licenseId: "CC-BY-4.0" });
  expect(candidate.release).toBe("4.0");
  expect(candidate.files).toEqual([{ filename: "isa_BP3D_4.0_obj_99.zip", url: "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip", sha256: "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e" }]);
  expect(candidate.attributionText).toBe("BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International");
});

it("pins Zenodo record 4506463 v2, authors, DOI and both exact file hashes", () => {
  const candidate = manifest.candidates[1];
  expect(candidate).toMatchObject({ recordId: 4506463, doi: "10.5281/zenodo.4506463", authors: ["Steffen Schuler", "Axel Loewe"] });
  expect(candidate.provenance).toMatchObject({ sourceId: "zenodo-4506463", sourceVersion: "v2", licenseId: "zenodo-4506463-CC-BY-4.0" });
  expect(candidate.files).toEqual([
    { filename: "heart_sur.vtp", url: "https://zenodo.org/api/records/4506463/files/heart_sur.vtp/content", sha256: "a94041d700b6a373deb1a59d9f8c0d75fe4692c2a9ca7c2bab4c0ed8e9a478b1", publisherMd5: "11069c64928db9faf60d34ffe916b73d" },
    { filename: "heart_vol.vtu", url: "https://zenodo.org/api/records/4506463/files/heart_vol.vtu/content", sha256: "c1f426654ed94609a54c2fac4ca70a511a5747cc0edc467d7977fa160f553e0b", publisherMd5: "9929ac1855094229b6afada85f95f563" },
  ]);
  expect(candidate.attributionText).toBe(ANATOMY_LICENSES.find(license => license.id === candidate.provenance.licenseId)!.requiredAttribution[0]);
});

it("keeps both licensed identities internal-review only using the existing contracts", () => {
  for (const candidate of manifest.candidates) {
    const provenance: AnatomyProvenance = candidate.provenance as AnatomyProvenance;
    const assessment: AnatomyAssessment = candidate.assessment as AnatomyAssessment;
    const source = ANATOMY_SOURCES.find(source => source.id === provenance.sourceId)!;
    expect(source).toMatchObject({ sourceVersion: provenance.sourceVersion, licenseId: provenance.licenseId });
    expect(ANATOMY_LICENSES.find(license => license.id === source.licenseId)).toMatchObject({ reviewStatus: "terms-reviewed", commercialCompatibility: "permitted-with-obligations" });
    expect(candidate).toMatchObject({ intakeStatus: "INTERNAL-REVIEW", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" });
    expect(provenance.licenseReview.status).toBe("unresolved");
    expect(assessment).toMatchObject({ geometryStatus: "not-imported", semanticStatus: "unverified", clinicalApprovalStatus: "unreviewed", renderCompatibility: "unvalidated" });
  }
});
