import type { HeartRiskLevel } from "@/lib/heart-age/heart-age.engine";

// Our own, owned motion graphic for the heart-story video's opening scene —
// not stock footage, not a third-party avatar, not a paid animation
// service. Rendered server-side by Shotstack's "html5" asset (real CSS
// @keyframes support — see shotstack.client.ts), through the rendering
// infrastructure we already pay for. Every number shown is real: this is
// the SAME already-validated HeartAgeResult that drives the narration, not
// a separate estimate.
//
// Deliberately built with inline CSS keyframes and a hand-authored SVG heart
// path rather than any purchased/downloaded animation asset, so there is
// zero third-party licensing on this graphic, ever — it is genuinely
// OrganHeal's own.

export type HeartHeroSceneInput = {
  chronologicalAge: number;
  heartAge: number;
  ageGapYears: number;
  tenYearRiskPercent: number;
  riskLevel: HeartRiskLevel;
};

export type HeartHeroScene = {
  html: string;
  css: string;
};

const RISK_COLOR: Record<HeartRiskLevel, string> = {
  "Low Risk": "#14b8a6",
  "Moderate Risk": "#f59e0b",
  "High Risk": "#ef4444",
};

const RISK_LABEL: Record<HeartRiskLevel, { en: string; ar: string }> = {
  "Low Risk": { en: "LOWER RISK", ar: "خطورة أقل" },
  "Moderate Risk": { en: "MODERATE RISK", ar: "خطورة متوسطة" },
  "High Risk": { en: "HIGHER RISK", ar: "خطورة أعلى" },
};

// A simple, widely-used flat heart silhouette path (hand-picked, not traced
// from any licensed icon set) — kept intentionally plain so it reads clearly
// at video resolution and recolors cleanly per risk level.
const HEART_SVG_PATH =
  "M50 88 C 20 65, 2 45, 2 28 C 2 12, 15 2, 28 2 C 38 2, 46 8, 50 16 C 54 8, 62 2, 72 2 C 85 2, 98 12, 98 28 C 98 45, 80 65, 50 88 Z";

function gapSentence(ageGapYears: number, language: "en" | "ar"): string {
  if (language === "ar") {
    if (ageGapYears <= 0) return "بعمرك الحقيقي أو أصغر";
    return `أكبر بـ ${ageGapYears} سنة من عمرك`;
  }

  if (ageGapYears <= 0) return "at or below your actual age";
  return `${ageGapYears} year${ageGapYears === 1 ? "" : "s"} older than you`;
}

/**
 * Pure and side-effect-free (no network, no Shotstack call) so it's directly
 * unit-testable — see tests/heart-hero-scene.test.ts.
 */
export function buildHeartHeroScene(
  input: HeartHeroSceneInput,
  language: "en" | "ar" = "en"
): HeartHeroScene {
  const color = RISK_COLOR[input.riskLevel];
  const riskLabel = language === "ar" ? RISK_LABEL[input.riskLevel].ar : RISK_LABEL[input.riskLevel].en;
  const heartAgeLabel = language === "ar" ? "عمر القلب" : "HEART AGE";
  const gap = gapSentence(input.ageGapYears, language);
  const dir = language === "ar" ? "rtl" : "ltr";

  const html = `
    <div class="scene" dir="${dir}">
      <svg class="heart" viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
        <path d="${HEART_SVG_PATH}" fill="${color}" />
      </svg>
      <div class="label">${heartAgeLabel}</div>
      <div class="number">${input.heartAge}</div>
      <div class="gap">${gap}</div>
      <div class="badge" style="border-color:${color};color:${color};">${riskLabel}</div>
    </div>
  `.trim();

  const css = `
    body { margin: 0; background: #061826; }
    .scene {
      width: 1280px;
      height: 720px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', Arial, sans-serif;
      background: radial-gradient(circle at 50% 30%, rgba(20,184,166,0.18), transparent 55%), #061826;
    }
    .heart {
      width: 140px;
      height: 126px;
      animation: heartbeat 1.1s ease-in-out infinite;
      animation-delay: 0.2s;
      opacity: 0;
      animation-fill-mode: forwards;
    }
    @keyframes heartbeat {
      0% { transform: scale(1); opacity: 1; }
      15% { transform: scale(1.14); }
      30% { transform: scale(1); }
      45% { transform: scale(1.08); }
      60% { transform: scale(1); }
      100% { transform: scale(1); opacity: 1; }
    }
    .label {
      margin-top: 28px;
      color: #d1fae5;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.12em;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 0.4s forwards;
    }
    .number {
      color: #ffffff;
      font-size: 150px;
      font-weight: 900;
      line-height: 1;
      transform: scale(0.6);
      opacity: 0;
      animation: popIn 0.6s cubic-bezier(0.2, 0.8, 0.3, 1.4) 0.6s forwards;
    }
    .gap {
      margin-top: 8px;
      color: #94a3b8;
      font-size: 26px;
      font-weight: 700;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 1.1s forwards;
    }
    .badge {
      margin-top: 24px;
      padding: 8px 22px;
      border: 2px solid;
      border-radius: 999px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.06em;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 1.4s forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.6); }
      to { opacity: 1; transform: scale(1); }
    }
  `.trim();

  return { html, css };
}
