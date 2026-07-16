export type HealthIntelligencePresentationLanguage =
  | "en"
  | "ar";

export function presentationText(
  language:
    HealthIntelligencePresentationLanguage,
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}