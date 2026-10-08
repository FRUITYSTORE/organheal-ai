import { expect, it } from "vitest";
import { createRequire } from "node:module";
import inventory from "../medical-assets/bodyparts3d-heart-inventory.json";
const { verifyArchive, parseObj, candidateRepresentation } = createRequire(import.meta.url)("../scripts/bodyparts3d-inventory.cjs");
it("rejects archive hash mismatch", () => {
  expect(() => verifyArchive(Buffer.from("wrong archive"), inventory.archiveSha256)).toThrow("BP3D_ARCHIVE_HASH_MISMATCH");
});
it("parses deterministic counts, connectivity and bounds without converting geometry", () => {
  const obj = "o part\nv 0 0 0\nv 1 0 0\nv 0 1 0\nv 9 9 9\nf 1 2 3\n";
  const expected = { objectCount: 1, vertexCount: 4, faceCount: 1, connectedComponents: 2, boundingBox: [[0,0,0],[9,9,9]] };
  expect(parseObj(obj)).toEqual(expected);
  expect(parseObj(obj.replaceAll("\n", "\r\n"))).toEqual(expected);
  expect(JSON.stringify(parseObj(obj))).toBe(JSON.stringify(parseObj(obj)));
});
it("never promotes cavities, walls, valve parts or compounds to verified anatomy", () => {
  for (const representation of ["cavity", "wall", "tissue", "vessel", "unsupported"]) {
    expect(candidateRepresentation({representation, proposedAnatomyStructureId:null, unresolved:"unverified source"})).toMatchObject({ candidateRepresentation:representation, verification:"unverified", completeCoverage:false, usableAsVerifiedAnatomy:false });
  }
  expect(inventory.representations).toHaveLength(39);
  expect(new Set(inventory.representations.flatMap(r => r.components.map(c => c.sourceFilename))).size).toBe(46);
  expect(inventory.myocardium.mapping).toBeNull();
  expect(inventory.septum.mapping).toBeNull();
  for (const row of inventory.representations) {
    expect(row.usableAsVerifiedAnatomy).toBe(false);
    expect(row.completeCoverage).toBe(false);
    expect(row.candidateStructureMapping).not.toBe("heart.myocardium");
    expect(row.candidateStructureMapping).not.toBe("heart.interventricularSeptum");
  }
});
