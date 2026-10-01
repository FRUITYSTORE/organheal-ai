import { describe, expect, it } from "vitest";
import type { AnatomyRegistryEntry, AnatomyRequirement, OrganModule } from "../lib/medical-motion/contracts/organ-module";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { checkAssetReadiness, createOrganStructureLookup, type RenderMode } from "../lib/symptom-explanation/asset-readiness";

// Hypothetical reviewed metadata only, not a new anatomical asset.
function structure(overrides: Partial<AnatomyRegistryEntry> = {}): AnatomyRegistryEntry {
  return {
    id: "heart.myocardium", kind: "myocardium", blenderObject: "TEST_MUSCLE",
    fidelity: "reference-derived", availability: "present", representation: "tissue", verification: "verified",
    coverage: { verifiedRegions: ["LV", "RV", "septum", "LA", "RA"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["test-review"] },
    ...overrides,
  } as AnatomyRegistryEntry;
}

function moduleWith(entry: AnatomyRegistryEntry): OrganModule {
  return { ...HEART_ORGAN_MODULE, assetStatus: "production", anatomicallyValidated: true, anatomyRegistry: [entry] };
}

function readiness(entry: AnatomyRegistryEntry, mode: RenderMode = "production", requirement: AnatomyRequirement = {}) {
  return checkAssetReadiness("heart", [entry.id], mode, () => moduleWith(entry), { [entry.id]: requirement });
}

function expectRefused(entry: AnatomyRegistryEntry, mode: RenderMode = "production", requirement: AnatomyRequirement = {}) {
  expect(readiness(entry, mode, requirement)).toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
}

describe("anatomy availability is independent of readiness", () => {
  it("accepts verified tissue with evidenced coverage and organ approval", () => {
    expect(readiness(structure(), "production", { representations: ["tissue"], requiredRegions: ["LV", "RV"], completeCoverage: true }))
      .toEqual({ ok: true, blenderObjects: ["TEST_MUSCLE"] });
  });

  it("keeps known missing structures out of lookup and Blender mapping", () => {
    const missing = structure({ availability: "missing", blenderObject: null, fidelity: null, representation: "unknown", verification: "unverified" });
    for (const mode of ["development", "production"] as const) {
      expect(readiness(missing, mode)).toEqual({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", details: ["heart.myocardium"] });
    }
    expect(createOrganStructureLookup(() => moduleWith(missing))("heart")).toEqual([]);
  });

  it.each(["unverified", "anatomy-conditional"] as const)("does not accept %s anatomy as verified, even in development", (verification) => {
    const entry = structure({ verification });
    expectRefused(entry);
    expectRefused(entry, "development", { requireVerified: true });
    expect(readiness(entry, "development").ok).toBe(true);
  });

  it("rejects rejected anatomy in either mode and excludes it from available lookup", () => {
    const rejected = structure({ verification: "rejected" });
    expectRefused(rejected);
    expectRefused(rejected, "development");
    expect(createOrganStructureLookup(() => moduleWith(rejected))("heart")).toEqual([]);
  });

  it("refuses partial availability for complete coverage, even with verified listed regions", () => {
    const partial = structure({ availability: "partial" });
    expectRefused(partial);
    expectRefused(partial, "development", { completeCoverage: true });
    expect(readiness(partial, "development", { requiredRegions: ["LV"] }).ok).toBe(true);
  });

  it.each(["unknownRegions", "excludedRegions"] as const)("refuses complete coverage and requested regions overlapping %s", (field) => {
    const entry = structure({ coverage: { ...structure().coverage, [field]: ["RV"] } });
    expectRefused(entry);
    expectRefused(entry, "development", { requiredRegions: ["RV"] });
  });

  it("refuses a missing required region rather than substituting available tissue", () => {
    expectRefused(structure(), "development", { requiredRegions: ["aortic-root"] });
  });

  it.each(["cavity", "surface", "centerline", "unknown"] as const)("does not accept %s as myocardium", (representation) => {
    expectRefused(structure({ representation }));
  });

  it("does not accept a chamber cavity or surface for an explicit muscular-wall use", () => {
    for (const representation of ["cavity", "surface"] as const) {
      expectRefused(structure({ id: "heart.leftVentricle", kind: "chamber", representation }), "development", { representations: ["tissue"] });
    }
  });

  it("rejects placeholder representation or fidelity despite a verified label", () => {
    expectRefused(structure({ representation: "placeholder" }));
    expectRefused(structure({ fidelity: "placeholder" }));
  });

  it.each([{ evidenceRefs: [] }, { evidenceRefs: [" "] }])("requires nonempty review evidence $evidenceRefs", ({ evidenceRefs }) => {
    expectRefused(structure({ coverage: { ...structure().coverage, evidenceRefs } }));
  });

  it("requires recorded verified regions, including when complete coverage is requested in development", () => {
    const entry = structure({ coverage: { verifiedRegions: [], unknownRegions: [], excludedRegions: [], evidenceRefs: ["review"] } });
    expectRefused(entry);
    expectRefused(entry, "development", { completeCoverage: true });
  });

  it("cannot override production verification with weaker requirements", () => {
    expectRefused(structure({ verification: "anatomy-conditional" }), "production", { requireVerified: false, completeCoverage: false });
  });

  it("does not approve the current heart merely by approving the whole organ", () => {
    const approved = { ...HEART_ORGAN_MODULE, assetStatus: "production" as const, anatomicallyValidated: true };
    expect(checkAssetReadiness("heart", ["heart.leftVentricle"], "production", () => approved).ok).toBe(false);
    for (const entry of HEART_ORGAN_MODULE.anatomyRegistry) {
      expect(entry.verification).toBe("unverified");
      expect(entry.coverage.verifiedRegions).toEqual([]);
      expect(entry.coverage.evidenceRefs).toEqual([]);
      if (entry.kind === "chamber") expect(entry.representation).toBe("surface");
      if (entry.kind === "coronaryArtery" && entry.availability !== "missing") expect(entry.representation).toBe("centerline");
    }
  });

  it("keeps the TotalSegmentator V1 class 44 candidate conditional with no inferred myocardial regions", () => {
    // No dataset is loaded: this exercises the unresolved external gate's metadata.
    const candidate = structure({ verification: "anatomy-conditional", representation: "unknown", coverage: {
      verifiedRegions: [], unknownRegions: ["LV", "RV", "septum", "LA", "RA"], excludedRegions: [], evidenceRefs: [],
    } });
    expectRefused(candidate);
    expectRefused(candidate, "development", { requireVerified: true });
  });

  it("keeps absent current myocardium failing in both modes", () => {
    for (const mode of ["development", "production"] as const) {
      expect(checkAssetReadiness("heart", ["heart.myocardium"], mode)).toEqual({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", details: ["heart.myocardium"] });
    }
  });
});
