const ORGAN_NAME_AR: Record<string, string> = {
  heart: "القلب",
  liver: "الكبد",
  lung: "الرئة",
  kidney: "الكلى",
  brain: "الدماغ",
  metabolic: "الأيض",
  general: "الصحة العامة",
  "general health": "الصحة العامة",
};

export function presentOrganName(
  name: string,
  language: "en" | "ar"
): string {
  if (language !== "ar") {
    return name;
  }

  return ORGAN_NAME_AR[name.trim().toLowerCase()] ?? name;
}
