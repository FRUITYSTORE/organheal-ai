import { expect, it } from "vitest";
import audit from "../medical-assets/apil-local-heart-inventory.json";

it("pins the content-verified local artifact without claiming exact upstream identity or clearance", () => {
  expect(audit).toMatchObject({ sourceCandidate: "HEART_REFERENCE", localArtifactIdentity: "VERIFIED_BY_CONTENT", exactSketchfabArtifactIdentity: "UNRESOLVED", licenseClearance: "unresolved", clinicalApproval: "unreviewed", patientFacing: false,
    outerArchiveSha256: "77c985a82328fe3179a03e7de6413b23be175113b7236a9a2470889664677913",
    nestedArchiveSha256: "3eedc632120a5f850e243c2d2c88daee8181ac3e06082e3dec778906183b7f05",
    fbxSha256: "e5a2a81a38f456c54e8d556b1db1c9c2000fcbf342374aa42b5f7369484dbf27" });
  expect(audit.outerFiles).toHaveLength(5);
  expect(audit.nestedFiles).toHaveLength(5);
  for (const file of [...audit.outerFiles, ...audit.nestedFiles]) expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
});

it("preserves the four source meshes, combined RARV semantics and measured QA limitations", () => {
  expect(audit.meshInventory.map(m => [m.objectName, m.vertices, m.triangles])).toEqual([
    ["APIL HEART 1 AORTA Edit", 38057, 76122],
    ["APIL HEART 1 LA Edit", 46127, 92618],
    ["APIL HEART 1 LV Edit", 90485, 183157],
    ["APIL HEART 1 RARV Edit", 70770, 141628],
  ]);
  expect(audit.totalVertices).toBe(245439);
  expect(audit.totalTriangles).toBe(493525);
  expect(audit.semantics["APIL HEART 1 RARV Edit"]).toBe("combined RA/RV candidate; no separate RA/RV binding");
  expect(audit.meshInventory[2]).toMatchObject({ boundaryEdges: 1, nonManifoldEdgesIncludingBoundaries: 4 });
  expect(audit.fbxGlobalSettings.UnitScaleFactor).toEqual([100]);
  expect(audit.anatomicalOrientation).toContain("UNRESOLVED");
  expect(audit.importResult).toBe("PASS");
  expect(audit.blenderVersion).toContain("5.2.1");
});
