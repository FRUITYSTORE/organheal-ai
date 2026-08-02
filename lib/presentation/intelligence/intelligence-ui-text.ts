export type IntelligenceUiLanguage = "en" | "ar";

export function createIntelligenceText(
  language: IntelligenceUiLanguage
) {
  return function text(en: string, ar: string) {
    return language === "ar" ? ar : en;
  };
}