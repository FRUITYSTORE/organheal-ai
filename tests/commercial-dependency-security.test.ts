import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import ExcelJS from "exceljs";
import { extractReportTextFromBuffer } from "../lib/report-ingestion/report-text-extractor";

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const minimums: Record<string, number[]> = {
  next: [16, 3, 6], sharp: [0, 35, 4], "fast-uri": [3, 1, 8],
  browserslist: [4, 28, 7], "js-yaml": [4, 3, 2],
};
function atLeast(version: string, minimum: number[]) {
  const actual = version.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== minimum[i]) return actual[i] > minimum[i];
  }
  return true;
}

describe("commercial dependency security regression", () => {
  it("keeps every resolved copy of remediated packages above the advisory floor", () => {
    for (const [name, minimum] of Object.entries(minimums)) {
      const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`);
      expect(copies.length, name).toBeGreaterThan(0);
      for (const [path, entry] of copies) expect(atLeast((entry as { version: string }).version, minimum), path).toBe(true);
    }
    for (const [path, entry] of Object.entries(lock.packages)) {
      if (!path.endsWith("/brace-expansion")) continue;
      const version = (entry as { version: string }).version;
      const minimum = { 1: [1, 1, 21], 2: [2, 1, 7], 5: [5, 0, 12] }[Number(version.split(".")[0])];
      expect(minimum, path).toBeDefined();
      expect(atLeast(version, minimum!), path).toBe(true);
    }
  });

  it("resolves patched native image decoding and rejects malformed images", async () => {
    expect(atLeast(sharp.versions.sharp, [0, 35, 4])).toBe(true);
    expect(sharp.versions.heif).toBeDefined();
    expect(atLeast(sharp.versions.heif!, [1, 23, 2])).toBe(true);
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "navy" } }).png().toBuffer();
    expect((await sharp(image).metadata()).format).toBe("png");
    await expect(sharp(Buffer.from("not an image")).toBuffer()).rejects.toThrow();
  });

  it("preserves real XLSX health-document extraction through the patched transitive tree", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Lipid panel").addRows([["Marker", "Value"], ["LDL", 142]]);
    const result = await extractReportTextFromBuffer({ buffer: Buffer.from(await workbook.xlsx.writeBuffer()), fileName: "fixture.xlsx" });
    expect(result.fileType).toBe("xlsx");
    expect(result.text).toContain("LDL");
    expect(result.text).toContain("142");
  });

  it("rejects URI authority injection in the patched serializer", () => {
    const uri = require("fast-uri");
    expect(() => uri.serialize({ scheme: "https", host: "trusted.invalid", port: "@127.0.0.1:8124", path: "/" })).toThrow();
    expect(new URL(uri.serialize({ scheme: "https", host: "trusted.invalid", port: "443", path: "/" })).hostname).toBe("trusted.invalid");
  });
});
