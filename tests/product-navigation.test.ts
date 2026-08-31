import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getProductNavigationAction,
  resolveProductNavigation,
} from "@/lib/health-intelligence/application/product-navigation/resolve-product-navigation";

describe("product navigation", () => {
  it("detects an English report upload request", () => {
    const result =
      resolveProductNavigation(
        "I want to upload my report"
      );

    expect(result.matched).toBe(true);
    expect(result.destination).toBe(
      "upload-report"
    );
  });

  it("detects an Arabic report upload request", () => {
    const result =
      resolveProductNavigation(
        "بدي ارفع تقرير طبي"
      );

    expect(result.matched).toBe(true);
    expect(result.destination).toBe(
      "upload-report"
    );
  });

  it("detects a colloquial Arabic results request", () => {
    const result =
      resolveProductNavigation(
        "وين النتيجة تبع التحليل"
      );

    expect(result.matched).toBe(true);
    expect(result.destination).toBe(
      "view-results"
    );
  });

  it("detects a health plan request", () => {
    const result =
      resolveProductNavigation(
        "افتح خطتي الصحية"
      );

    expect(result.matched).toBe(true);
    expect(result.destination).toBe(
      "health-plan"
    );
  });

  it("detects a learning request", () => {
    const result =
      resolveProductNavigation(
        "أريد أن أتعلم أكثر"
      );

    expect(result.matched).toBe(true);
    expect(result.destination).toBe(
      "learning"
    );
  });

  it("does not hijack a clinical report question", () => {
    const result =
      resolveProductNavigation(
        "What does my report mean?"
      );

    expect(result.matched).toBe(false);
    expect(result.destination).toBeNull();
  });

  it("does not hijack an Arabic clinical interpretation question", () => {
    const result =
      resolveProductNavigation(
        "ماذا تعني نتيجة الكوليسترول عندي"
      );

    expect(result.matched).toBe(false);
    expect(result.destination).toBeNull();
  });

  it("returns the correct action for report upload", () => {
    const action =
      getProductNavigationAction(
        "upload-report"
      );

    expect(action.href).toBe(
      "/lab-upload"
    );

    expect(action.label.en).toBe(
      "Upload a Medical Report"
    );

    expect(action.label.ar).toBe(
      "رفع تقرير طبي"
    );
  });

  it("returns the correct action for results", () => {
    const action =
      getProductNavigationAction(
        "view-results"
      );

    expect(action.href).toBe(
      "/intelligence"
    );
  });

  it("returns no navigation for an unrelated question", () => {
    const result =
      resolveProductNavigation(
        "How are you today?"
      );

    expect(result).toEqual({
      matched: false,
      destination: null,
      confidence: "low",
      matchedKeywords: [],
    });
  });
});