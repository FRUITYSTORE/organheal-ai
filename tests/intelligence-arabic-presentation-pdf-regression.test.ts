import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  presentHealthTimelineSummary,
  presentLabMarkerName,
  presentLabTrendDirection,
  presentLabTrendSummary,
} from "@/lib/presentation/intelligence/lab-marker-presentation";

describe(
  "Arabic Intelligence presentation and PDF regression",
  () => {
    it(
      "localizes patient-facing laboratory marker names without changing canonical abbreviations",
      () => {
        expect(
          presentLabMarkerName(
            "Glucose",
            "ar"
          )
        ).toBe(
          "الجلوكوز"
        );

        expect(
          presentLabMarkerName(
            "Total Cholesterol",
            "ar"
          )
        ).toBe(
          "الكوليسترول الكلي"
        );

        expect(
          presentLabMarkerName(
            "Triglycerides",
            "ar"
          )
        ).toBe(
          "الدهون الثلاثية"
        );

        expect(
          presentLabMarkerName(
            "Creatinine",
            "ar"
          )
        ).toBe(
          "الكرياتينين"
        );

        expect(
          presentLabMarkerName(
            "Hemoglobin",
            "ar"
          )
        ).toBe(
          "الهيموغلوبين"
        );

        expect(
          presentLabMarkerName(
            "LDL",
            "ar"
          )
        ).toBe(
          "LDL"
        );

        expect(
          presentLabMarkerName(
            "HbA1c",
            "ar"
          )
        ).toBe(
          "HbA1c"
        );
      }
    );

    it(
  "keeps doctor brief PDF content inside safe page boundaries",
  () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "app/intelligence/components/DoctorBriefReportCard.tsx"
        ),
        "utf8"
      );

    expect(source).toContain(
      'presentLabMarkerName('
    );

    expect(source).toMatch(
      /querySelectorAll\("p,\s*li"\)[\s\S]*?breakInside\s*=\s*"auto"[\s\S]*?pageBreakInside\s*=\s*"auto"/
    );

    expect(source).toContain(
      'margin: "0"'
    );

    expect(source).toContain(
      '".doctorBriefSectionHeading"'
    );

    expect(source).toContain(
      'margin: [16, 18, 24, 18]'
    );
  }
);

    it(
  "localizes patient PDF marker names and keeps health trend pagination flexible",
  () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "app/intelligence/components/PatientReportPdfCard.tsx"
        ),
        "utf8"
      );

    expect(source).toContain(
      "presentPatientReportMarkerText"
    );

    expect(source).toContain(
      'presentLabMarkerName('
    );

    expect(source).toMatch(
      /\.patientHealthStorySection\s*\{[\s\S]*?break-inside:\s*auto[\s\S]*?page-break-inside:\s*auto/
    );

    expect(source).toMatch(
      /querySelectorAll\([\s\S]*?"\.patientHealthStorySection"[\s\S]*?\)[\s\S]*?breakInside\s*=\s*"auto"[\s\S]*?pageBreakInside\s*=\s*"auto"/
    );

    const pagebreakAvoid =
      source.match(
        /pagebreak:\s*\{[\s\S]*?avoid:\s*\[([\s\S]*?)\]/
      )?.[1] ?? "";

    expect(
      pagebreakAvoid
    ).not.toContain(
      '".patientHealthStorySection"'
    );
  }
);

    it(
      "localizes laboratory trend direction and summary",
      () => {
        expect(
          presentLabTrendDirection(
            "Worsening",
            "ar"
          )
        ).toBe(
          "تراجع"
        );

        expect(
          presentLabTrendDirection(
            "Stable",
            "ar"
          )
        ).toBe(
          "مستقر"
        );

        const summary =
          presentLabTrendSummary({
            marker:
              "Total Cholesterol",

            earliestValue:
              236,

            latestValue:
              238,

            unit:
              "mg/dL",

            direction:
              "Stable",

            fallbackSummary:
              "Total Cholesterol changed from 236 mg/dL to 238 mg/dL. Trend: Stable.",

            language:
              "ar",
          });

        expect(
          summary
        ).toContain(
          "الكوليسترول الكلي"
        );

        expect(
          summary
        ).toContain(
          "مستقر"
        );

        expect(
          summary
        ).not.toContain(
          "changed from"
        );

        expect(
          summary
        ).not.toContain(
          "Trend:"
        );
      }
    );

    it(
      "can localize legacy health timeline summaries",
      () => {
        const summary =
          presentHealthTimelineSummary(
            "Health timeline shows decline of -10 points across 7 data points.",
            "ar"
          );

        expect(
          summary
        ).toMatch(
          /[\u0600-\u06FF]/
        );

        expect(
          summary
        ).not.toContain(
          "Health timeline shows"
        );
      }
    );

    it(
      "does not force a lab-table page break and protects paragraphs from splitting",
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              "app/intelligence/components/PatientReportPdfCard.tsx"
            ),
            "utf8"
          );

        expect(
          source
        ).not.toContain(
          'className="patientLabPageBreak"'
        );

        expect(
          source
        ).not.toContain(
          "page-break-before: always"
        );

        expect(
          source
        ).toMatch(
          /querySelectorAll\("p,\s*li"\)[\s\S]*?breakInside\s*=\s*"avoid"[\s\S]*?pageBreakInside\s*=\s*"avoid"/
        );
      }
    );
  }
);