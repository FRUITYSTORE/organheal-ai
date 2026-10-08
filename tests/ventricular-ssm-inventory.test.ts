import { expect, it } from "vitest";
import { createRequire } from "node:module";
import inventory from "../medical-assets/ventricular-ssm-inventory.json";
const { verifySource, buildInventory } = createRequire(import.meta.url)("../scripts/ventricular-ssm-inventory.cjs");
const evidence = { artifacts: inventory.artifacts, surface: inventory.surface,
  surfaceArrays: inventory.surface.arrays, volume: inventory.volume, regions: inventory.regions, mixedClassTriangles: inventory.mixedClassTriangles };

it("rejects wrong source bytes and unknown files rather than accepting an inventory label", () => {
  expect(() => verifySource(Buffer.from("wrong"), "heart_sur.vtp")).toThrow("SSM_SOURCE_HASH_MISMATCH");
  expect(() => verifySource(Buffer.from("wrong"), "unknown.vtp")).toThrow("SSM_SOURCE_HASH_MISMATCH");
  expect(inventory.artifacts.map(a => a.sha256)).toEqual([
    "a94041d700b6a373deb1a59d9f8c0d75fe4692c2a9ca7c2bab4c0ed8e9a478b1",
    "c1f426654ed94609a54c2fac4ca70a511a5747cc0edc467d7977fa160f553e0b",
  ]);
});
it("preserves exact dataset counts, labels and deterministic semantic audit", () => {
  const first = buildInventory(evidence, inventory.surfaceVolumeCorrespondence, inventory.evidenceFiles);
  expect(first).toEqual(buildInventory(structuredClone(evidence), inventory.surfaceVolumeCorrespondence, inventory.evidenceFiles));
  expect(inventory.surface.points).toBe(99953);
  expect(inventory.surface.triangles).toBe(199902);
  expect(inventory.volume.points).toBe(478820);
  expect(inventory.volume.tetrahedra).toBe(2555157);
  expect(inventory.regions.map(r => [r.label,r.name,r.pointCount])).toEqual([
    [1,"base",2118],[2,"epicardium",45580],[3,"LV endocardium",22821],[4,"RV endocardium",29433],[5,"apex",1],
  ]);
  expect(inventory.mixedClassTriangles).toBe(1636);
  expect(() => buildInventory({ ...evidence, regions: [] }, inventory.surfaceVolumeCorrespondence, [])).toThrow("SSM_INVENTORY_EVIDENCE_MISMATCH");
  expect(() => buildInventory({ ...evidence, volume: { ...evidence.volume, arrays: [{ key: "CellData/septum" }] } }, inventory.surfaceVolumeCorrespondence, [])).toThrow("SSM_INVENTORY_EVIDENCE_MISMATCH");
});
it("qualifies only limited source boundaries and composite tissue without canonical promotion", () => {
  const qualified = inventory.mappings.filter(m => m.classification === "QUALIFIED_INTERNAL_REVIEW");
  expect(qualified).toHaveLength(6);
  expect(qualified.filter(m => m.proposedStructureId !== null).map(m => [m.proposedStructureId,m.representation])).toEqual([
    ["heart.leftVentricle","surface"],["heart.rightVentricle","surface"],
  ]);
  expect(inventory.mappings.filter(m => m.classification === "UNRESOLVED").map(m => m.proposedStructureId)).toEqual([
    "heart.myocardium","heart.septum.interventricular","heart.septum.interatrial",
  ]);
  expect(inventory.mappings.filter(m => m.classification === "REJECTED")).toHaveLength(2);
  expect(inventory.safety.completeMyocardiumAvailable).toBe(false);
  expect(inventory.safety.independentSeptumAvailable).toBe(false);
  expect(inventory.volume.tissueRegionLabels).toEqual([]);
  expect(inventory.runtimeActivated).toBe(false);
});
it("retains source units and unresolved orientation without guessed transforms", () => {
  expect(inventory.coordinates.units).toBe("millimeter");
  expect(inventory.coordinates.orientation).toBe("UNRESOLVED");
  expect(inventory.coordinates.axisConvention).toBeNull();
  expect(inventory.coordinates.transform).toBe("unchanged source coordinates");
  expect(inventory.surface.boundaryEdges).toBe(0);
  expect(inventory.surface.componentPointCounts).toEqual([99953]);
  expect(inventory.volume.componentPointCounts).toEqual([478820]);
});
