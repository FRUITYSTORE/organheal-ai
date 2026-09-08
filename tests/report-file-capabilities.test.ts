import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSupportedReportFile,
  resolveReportFileCapability,
} from "@/lib/report-ingestion/report-file-capabilities";

describe(
  "report file capabilities",
  () => {
    it.each([
      "report.pdf",
      "report.docx",
      "report.txt",
      "report.md",
      "report.rtf",
      "report.csv",
      "report.xlsx",
      "report.json",
      "report.xml",
      "report.png",
      "report.jpg",
      "report.jpeg",
      "report.webp",
      "report.bmp",
    ])(
      "accepts supported report format %s",
      (
        fileName
      ) => {
        expect(
          isSupportedReportFile({
            fileName,
          })
        ).toBe(
          true
        );
      }
    );

    it.each([
      "legacy.doc",
      "legacy.xls",
      "scan.heic",
      "scan.tiff",
      "study.dcm",
      "brain.nii",
      "brain.nii.gz",
    ])(
      "does not advertise planned capability %s as analysis-ready",
      (
        fileName
      ) => {
        expect(
          isSupportedReportFile({
            fileName,
          })
        ).toBe(
          false
        );

        expect(
          resolveReportFileCapability({
            fileName,
          })
        ).not.toBeNull();
      }
    );

    it(
      "recognizes DICOM as medical imaging rather than a normal document",
      () => {
        expect(
          resolveReportFileCapability({
            fileName:
              "ct-study.dcm",
          })?.kind
        ).toBe(
          "medical-imaging"
        );
      }
    );

    it(
      "does not accept arbitrary unknown files",
      () => {
        expect(
          isSupportedReportFile({
            fileName:
              "unknown.exe",
          })
        ).toBe(
          false
        );
      }
    );
  }
);