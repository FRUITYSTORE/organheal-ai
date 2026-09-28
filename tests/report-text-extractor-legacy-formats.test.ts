import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  extractTextFromHeicBuffer,
  extractTextFromLegacyXlsBuffer,
  hasOleContainer,
} from "../lib/report-ingestion/report-text-extractor";

describe("hasOleContainer", () => {
  it("recognizes the real OLE Compound File magic bytes", () => {
    const oleHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);

    expect(hasOleContainer(oleHeader)).toBe(true);
  });

  it("rejects a ZIP-based container (DOCX/XLSX) and other unrelated bytes", () => {
    expect(hasOleContainer(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
    expect(hasOleContainer(Buffer.from("not an office file at all"))).toBe(false);
  });

  it("rejects a buffer shorter than the magic bytes", () => {
    expect(hasOleContainer(Buffer.from([0xd0, 0xcf]))).toBe(false);
  });
});

describe("extractTextFromLegacyXlsBuffer", () => {
  it("reads real cell values back out of a genuine legacy .xls (BIFF8) file", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Marker", "Value", "Unit"],
      ["LDL", 142, "mg/dL"],
      ["HDL", 51, "mg/dL"],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "Lipid Panel");

    const xlsBuffer = XLSX.write(workbook, { type: "buffer", bookType: "biff8" }) as Buffer;

    expect(hasOleContainer(xlsBuffer)).toBe(true);

    const text = await extractTextFromLegacyXlsBuffer(xlsBuffer);

    expect(text).toContain("Sheet: Lipid Panel");
    expect(text).toContain("LDL");
    expect(text).toContain("142");
    expect(text).toContain("HDL");
  });

  it("rejects a buffer that is not really an OLE container", async () => {
    await expect(extractTextFromLegacyXlsBuffer(Buffer.from("plain text, not xls"))).rejects.toThrow(
      "valid XLS container"
    );
  });
});

describe("extractTextFromHeicBuffer", () => {
  it("surfaces a clear error instead of throwing something opaque when the bytes are not decodable HEIC", async () => {
    await expect(extractTextFromHeicBuffer(Buffer.from("not a real heic file"))).rejects.toThrow(
      "HEIC/HEIF decoding failed"
    );
  });
});
