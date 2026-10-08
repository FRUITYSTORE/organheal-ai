import { expect, it } from "vitest";
import manifest from "../medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json";
import inventory from "../medical-assets/bodyparts3d-heart-inventory.json";

it("preserves official Release 4.0 millimeter axes and every identity transform", () => {
  expect(manifest.coordinateSystem).toEqual(inventory.coordinateSystem);
  expect(manifest.coordinateSystem).toMatchObject({ verification: "official-source-verified", physicalUnit: "millimeter", axes: { positiveX: "patient-left", negativeX: "patient-right", positiveY: "posterior", negativeY: "anterior", positiveZ: "superior" }, organHealAxisCompatible: true,
    evidence: { release: "4.0", url: "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20130619/coordinate_system.png", sha256: "338736275c11eac8c89531fdc14193c9a8adf5baab674033d9d89259f152a5f6" } });
  expect(JSON.parse(JSON.stringify(manifest.coordinateSystem))).toEqual(manifest.coordinateSystem);
  for (const asset of manifest.assets) {
    expect(asset.transform).toEqual({ units: "millimeter", matrix: [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]] });
    expect(asset.anatomicalVerification).toBe(false);
    expect(asset.clinicalApproval).toBe(false);
  }
  expect(manifest.runtimeActivated).toBe(false);
  expect(manifest.myocardiumAvailable).toBe(false);
  expect(manifest.septumAvailable).toBe(false);
});
