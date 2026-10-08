import { expect, it } from "vitest";
import inventory from "../medical-assets/bodyparts3d-heart-inventory.json";

it("assigns exactly one review qualification to all 39 source representations", () => {
  expect(inventory.representations).toHaveLength(39);
  for (const row of inventory.representations) {
    expect(["QUALIFIED_INTERNAL_REVIEW", "REJECTED", "UNRESOLVED"]).toContain(row.conversionQualification);
    expect(row.qualificationReason.length).toBeGreaterThan(0);
    expect(row.qualificationLimitations.length).toBeGreaterThan(0);
  }
  expect(inventory.representations.filter(r => r.conversionQualification === "QUALIFIED_INTERNAL_REVIEW")).toHaveLength(36);
});

it("keeps generic ventricular wall and inconsistent PART-OF compounds unresolved", () => {
  expect(inventory.representations.filter(r => r.conversionQualification === "UNRESOLVED").map(r => r.representationId).sort()).toEqual(["BP7815", "BP9596", "BP9847"]);
  for (const row of inventory.representations.filter(r => r.sourceTable === "partof_parts_list_e.txt")) {
    expect(row.conversionQualification).toBe("UNRESOLVED");
    expect(row.candidateStructureMapping).toBeNull();
  }
  expect(inventory.myocardium.mapping).toBeNull();
  expect(inventory.septum.mapping).toBeNull();
});

it("qualification preserves source-part semantics without promoting readiness", () => {
  for (const row of inventory.representations) {
    expect(row.verification).toBe("unverified");
    expect(row.completeCoverage).toBe(false);
    expect(row.usableAsVerifiedAnatomy).toBe(false);
    if (row.category === "chamber-cavity-surface") expect(row.candidateRepresentation).toBe("cavity");
    if (row.category === "valve-component") expect(row.qualificationLimitations).toContain("Leaflet/cusp only, never a complete valve; septal leaflet is not interventricular septum.");
  }
  expect(inventory.runtimeActivated).toBe(false);
  expect(inventory.geometryConverted).toBe(false);
});
