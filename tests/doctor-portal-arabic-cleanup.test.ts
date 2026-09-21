import { describe, expect, it } from "vitest";

import {
  presentDoctorBriefLabel,
  presentDoctorPortalClinicalText,
} from "@/lib/services/doctor-portal/doctor-portal-presentation";

import { presentOrganName } from "@/lib/health-intelligence/presentation/organ-name.presentation";

describe("doctor portal Arabic cleanup", () => {
  it("replaces Arabic text that has untranslated English sentences mixed in", () => {
    const mixed =
      "المؤشرات المكتشفة: Glucose: 152 mg/dL. With consistent follow-up and targeted lifestyle changes, cardiovascular health may improve.";

    const result = presentDoctorPortalClinicalText(mixed, "ar", "doctor-brief");

    expect(result).not.toContain("consistent follow-up");
    expect(/[؀-ۿ]/.test(result)).toBe(true);
  });

  it("keeps Arabic text that only contains marker names and units", () => {
    const text =
      "ارتفع HbA1c إلى 7.8 % وارتفع LDL إلى 158 mg/dL ويلزم مراجعة الطبيب.";

    expect(presentDoctorPortalClinicalText(text, "ar", "report-summary")).toBe(
      text
    );
  });

  it("leaves English text untouched in English mode", () => {
    const text =
      "With consistent follow-up and targeted lifestyle changes health may improve.";

    expect(presentDoctorPortalClinicalText(text, "en", "doctor-brief")).toBe(
      text
    );
  });

  it("translates the known doctor brief profile and risk pattern labels", () => {
    expect(
      presentDoctorBriefLabel("Cardiometabolic Risk Pattern", "ar")
    ).toBe("نمط مخاطر القلب والأيض");

    expect(presentDoctorBriefLabel("Balanced Health Profile", "ar")).toBe(
      "ملف صحي متوازن"
    );
  });

  it("never shows an unknown English label in Arabic", () => {
    expect(presentDoctorBriefLabel("Some New English Label", "ar")).toBe(
      "غير متاح"
    );

    expect(presentDoctorBriefLabel(null, "ar")).toBe("غير متاح");
    expect(presentDoctorBriefLabel("Some New English Label", "en")).toBe(
      "Some New English Label"
    );
  });

  it("localizes organ names only for Arabic", () => {
    expect(presentOrganName("Kidney", "ar")).toBe("الكلى");
    expect(presentOrganName("Brain", "ar")).toBe("الدماغ");
    expect(presentOrganName("Kidney", "en")).toBe("Kidney");
    expect(presentOrganName("Unknown Organ", "ar")).toBe("Unknown Organ");
  });
});
