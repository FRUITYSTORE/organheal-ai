import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import inventory from "../medical-assets/bodyparts3d-heart-inventory.json";
import manifest from "../medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json";
const { convertRepresentation, sha256 } = createRequire(import.meta.url)("../scripts/bodyparts3d-conversion.cjs");
const source = (name: string) => readFileSync(path.join(tmpdir(), "organheal-bodyparts3d-heart-review", "meshes", name));

it("reproduces all 36 derived assets byte-for-byte without combining representations", () => {
  const selected = inventory.representations.filter(r => r.conversionQualification === "QUALIFIED_INTERNAL_REVIEW");
  expect(manifest.assets).toHaveLength(36);
  for (const row of selected) {
    const first = convertRepresentation(row, source), second = convertRepresentation(row, source);
    const record = manifest.assets.find(a => a.representationId === row.representationId)!;
    expect(first.output.equals(second.output)).toBe(true);
    expect(first.record).toEqual(record);
    const stored = readFileSync(path.join("medical-assets/candidates/bodyparts3d-4.0", record.derivedFile));
    expect(sha256(stored)).toBe(record.derivedHash);
    expect(stored.equals(first.output)).toBe(true);
    const points = (bytes: Buffer) => bytes.toString("utf8").split(/\r?\n/).filter(line => /^v\s/.test(line)).map(line => line.trim().split(/\s+/).slice(1, 4).map(Number));
    expect(points(stored)).toEqual([...row.components].sort((a,b) => a.sourceFilename.localeCompare(b.sourceFilename)).flatMap(c => points(source(c.sourceFilename))));
    expect(record.proposedOrganHealStructureId).toBe(row.candidateStructureMapping);
  }
});

it("rejects modified source bytes and all unresolved representations", () => {
  const row = inventory.representations.find(r => r.conversionQualification === "QUALIFIED_INTERNAL_REVIEW")!;
  expect(() => convertRepresentation(row, () => Buffer.from("changed"))).toThrow("BP3D_SOURCE_HASH_MISMATCH");
  for (const unresolved of inventory.representations.filter(r => r.conversionQualification === "UNRESOLVED")) {
    expect(() => convertRepresentation(unresolved, source)).toThrow("BP3D_REPRESENTATION_NOT_QUALIFIED");
    expect(manifest.assets.some(a => a.representationId === unresolved.representationId)).toBe(false);
  }
});
