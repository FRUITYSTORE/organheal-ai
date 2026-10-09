import { expect, it } from "vitest";
import audit from "../medical-assets/heart-hero-local-inventory.json";

it("pins only the local HERO artifact and preserves unapproved provenance", () => {
  expect(audit).toMatchObject({ sourceCandidate: "HEART_HERO", localArtifactIdentity: "VERIFIED_BY_CONTENT", exactSketchfabArtifactIdentity: "UNRESOLVED", licenseClearance: "unresolved", clinicalApproval: "unreviewed", patientFacing: false, anatomicalMappings: [],
    outerArchiveSha256: "7b2ad3593e168bb15f1f094728ad9bec5ddc96ef6e8aa5e75c9bf57e5789f62c",
    sourceModelSha256: "2091d877ce87b452f10dcddcd28ae04b6369d220728baddfb10341bed5e86bed" });
  expect(audit.files).toHaveLength(5);
  for (const file of audit.files) expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit.anatomicalOrientation).toContain("UNRESOLVED");
  expect(audit.physicalScale).toContain("UNRESOLVED");
});

it("records the single mesh QA and three real diagnostic views without structure promotion", () => {
  expect(audit.meshInventory).toHaveLength(1);
  expect(audit.meshInventory[0]).toMatchObject({ objectName: "tripo_node_a904c0bd", vertices: 499992, triangles: 1000048, connectedComponents: 11, boundaryEdges: 3, nonManifoldEdgesIncludingBoundaries: 4, zeroAreaTriangles: 2, duplicateFaces: 0, nonfiniteCoordinates: 0, materials: ["tripo_mat_a904c0bd"] });
  expect(audit.meshInventory[0].uvSets[0]).toMatchObject({ name: "UVMap", loopCount: 3000144, finiteLoops: 3000144, nonzeroUvTriangles: 998471 });
  expect(audit.textures).toHaveLength(4);
  expect(audit.textures.every(t => t.dimensions[0] === 2048 && t.dimensions[1] === 2048)).toBe(true);
  expect(audit.blenderResult).toBe("PASS");
  expect(audit.renders.map(r => r.angleDegrees)).toEqual([0, 120, 240]);
  for (const render of audit.renders) expect(render.dimensions).toEqual([1080, 1080]);
});
