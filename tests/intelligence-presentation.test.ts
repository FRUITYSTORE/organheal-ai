import {
  describe,
  expect,
  it,
} from "vitest";

import {
  presentIntelligenceConfidenceLevel,
  presentIntelligenceLegacyNextAction,
  presentIntelligencePrioritySystem,
  presentIntelligenceRiskLevel,
  presentIntelligenceStatus,
  presentIntelligenceTrend,
  presentIntelligenceClinicalText,
  presentIntelligenceMedicalCategory,
} from "@/lib/services/intelligence/intelligence-presentation";

describe(
  "intelligence presentation localization",
  () => {
    it(
      "preserves structured English presentation",
      () => {
        expect(
          presentIntelligenceStatus(
            "Processing",
            "en"
          )
        ).toBe(
          "Processing"
        );

        expect(
          presentIntelligenceRiskLevel(
            "High",
            "en"
          )
        ).toBe(
          "High"
        );

        expect(
          presentIntelligencePrioritySystem(
            "Heart Health",
            "en"
          )
        ).toBe(
          "Heart Health"
        );
      }
    );

    it(
      "localizes report statuses",
      () => {
        expect(
          presentIntelligenceStatus(
            "Pending",
            "ar"
          )
        ).toBe(
          "قيد الانتظار"
        );

        expect(
          presentIntelligenceStatus(
            "Processing",
            "ar"
          )
        ).toBe(
          "قيد المعالجة"
        );

        expect(
          presentIntelligenceStatus(
            "Completed",
            "ar"
          )
        ).toBe(
          "مكتمل"
        );

        expect(
          presentIntelligenceStatus(
            "Failed",
            "ar"
          )
        ).toBe(
          "تعذر التنفيذ"
        );
      }
    );

    it(
  "preserves English clinical text in English UI",
  () => {
    expect(
      presentIntelligenceClinicalText(
        "LDL is elevated and requires follow-up.",
        "en",
        "ملخص عربي غير متاح."
      )
    ).toBe(
      "LDL is elevated and requires follow-up."
    );
  }
);

it(
  "preserves already Arabic clinical text in Arabic UI",
  () => {
    expect(
      presentIntelligenceClinicalText(
        "يوجد ارتفاع في LDL ويحتاج إلى متابعة.",
        "ar",
        "ملخص عربي غير متاح."
      )
    ).toBe(
      "يوجد ارتفاع في LDL ويحتاج إلى متابعة."
    );
  }
);

it(
  "does not expose English clinical free text in Arabic UI",
  () => {
    const result =
      presentIntelligenceClinicalText(
        "LDL is elevated and requires clinical follow-up.",
        "ar",
        "تم حفظ التحليل، لكن الملخص العربي غير متاح لهذا السجل."
      );

    expect(
      result
    ).toBe(
      "تم حفظ التحليل، لكن الملخص العربي غير متاح لهذا السجل."
    );

    expect(
      result
    ).not.toContain(
      "requires clinical follow-up"
    );
  }
);

it(
  "localizes known medical categories",
  () => {
    expect(
      presentIntelligenceMedicalCategory(
        "Laboratory",
        "ar"
      )
    ).toBe(
      "التحاليل المخبرية"
    );

    expect(
      presentIntelligenceMedicalCategory(
        "Cardiology",
        "ar"
      )
    ).toBe(
      "القلب"
    );

    expect(
      presentIntelligenceMedicalCategory(
        "Renal",
        "ar"
      )
    ).toBe(
      "الكلى"
    );
  }
);

it(
  "does not expose unknown English medical categories in Arabic",
  () => {
    expect(
      presentIntelligenceMedicalCategory(
        "Unknown Specialty",
        "ar"
      )
    ).toBe(
      "فئة طبية"
    );
  }
);

    it(
      "localizes risk levels",
      () => {
        expect(
          presentIntelligenceRiskLevel(
            "Low",
            "ar"
          )
        ).toBe(
          "منخفض"
        );

        expect(
          presentIntelligenceRiskLevel(
            "Moderate",
            "ar"
          )
        ).toBe(
          "متوسط"
        );

        expect(
          presentIntelligenceRiskLevel(
            "High",
            "ar"
          )
        ).toBe(
          "مرتفع"
        );

        expect(
          presentIntelligenceRiskLevel(
            "Critical",
            "ar"
          )
        ).toBe(
          "حرج"
        );
      }
    );

    it(
      "localizes priority systems",
      () => {
        expect(
          presentIntelligencePrioritySystem(
            "Heart Health",
            "ar"
          )
        ).toBe(
          "القلب"
        );

        expect(
          presentIntelligencePrioritySystem(
            "Kidney Health",
            "ar"
          )
        ).toBe(
          "الكلى"
        );

        expect(
          presentIntelligencePrioritySystem(
            "Preventive Health Monitoring",
            "ar"
          )
        ).toBe(
          "المتابعة الصحية الوقائية"
        );
      }
    );

    it(
      "does not expose unknown English priority labels in Arabic",
      () => {
        expect(
          presentIntelligencePrioritySystem(
            "Unknown Clinical Domain",
            "ar"
          )
        ).toBe(
          "مجال صحي"
        );
      }
    );

    it(
      "localizes health trends",
      () => {
        expect(
          presentIntelligenceTrend(
            "Improving",
            "ar"
          )
        ).toBe(
          "متحسن"
        );

        expect(
          presentIntelligenceTrend(
            "Worsening",
            "ar"
          )
        ).toBe(
          "متراجع"
        );

        expect(
          presentIntelligenceTrend(
            "Stable",
            "ar"
          )
        ).toBe(
          "مستقر"
        );
      }
    );

    it(
      "localizes confidence levels",
      () => {
        expect(
          presentIntelligenceConfidenceLevel(
            "High",
            "ar"
          )
        ).toBe(
          "مرتفعة"
        );

        expect(
          presentIntelligenceConfidenceLevel(
            "Moderate",
            "ar"
          )
        ).toBe(
          "متوسطة"
        );

        expect(
          presentIntelligenceConfidenceLevel(
            "Low",
            "ar"
          )
        ).toBe(
          "منخفضة"
        );
      }
    );

    it(
      "does not expose an English legacy next action in Arabic",
      () => {
        const result =
          presentIntelligenceLegacyNextAction(
            "Review this finding with your healthcare professional.",
            "ar"
          );

        expect(
          result
        ).toBe(
          "راجع النتائج والخطوات التالية المقترحة في تحليلك الصحي."
        );

        expect(
          result
        ).not.toContain(
          "healthcare professional"
        );
      }
    );

    it(
      "preserves already Arabic structured values",
      () => {
        expect(
          presentIntelligenceRiskLevel(
            "مرتفع",
            "ar"
          )
        ).toBe(
          "مرتفع"
        );

        expect(
          presentIntelligencePrioritySystem(
            "القلب",
            "ar"
          )
        ).toBe(
          "القلب"
        );
      }
    );
  }
);