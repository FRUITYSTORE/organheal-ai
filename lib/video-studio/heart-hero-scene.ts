import type { HeartRiskLevel } from "@/lib/heart-age/heart-age.engine";
import type { HeartFocus } from "@/lib/heart-age/heart-focus";
import { ARABIC_FONT_FACE_CSS } from "@/lib/video-studio/video-fonts";

// Our own, owned motion graphic for the heart-story video's opening scene —
// not stock footage, not a third-party avatar, not a licensed icon set.
// Rendered server-side by Shotstack's "html5" asset (real CSS @keyframes
// support — see shotstack.client.ts), through the rendering infrastructure
// we already pay for.
//
// This is a REAL four-chamber heart diagram (right atrium/ventricle in
// blue/deoxygenated on the left, left atrium/ventricle in red/oxygenated on
// the right — the standard medical-illustration convention, and the
// orientation used in every patient-education diagram: you're facing the
// patient, so their right side is on your left), not a decorative icon.
// It highlights the SPECIFIC structure this member's own risk factors
// actually implicate (see heart-focus.ts):
//   - coronary arteries (LAD/RCA/LCx) light up for cholesterol/smoking/
//     diabetes — the mechanism is plaque narrowing the vessel.
//   - the left ventricle wall + aorta light up for high blood pressure —
//     a mechanically different process (workload/strain, not plaque).
// A member with neither active risk factor still sees the full labeled
// heart, calm and unhighlighted — the diagram is never empty.
//
// Every number and every highlighted structure comes from the same
// already-validated HeartAgeResult / HeartFocus that drive the narration —
// nothing here is invented for the picture.

export type HeartHeroSceneInput = {
  chronologicalAge: number;
  heartAge: number;
  ageGapYears: number;
  tenYearRiskPercent: number;
  riskLevel: HeartRiskLevel;
  focus: HeartFocus;
};

export type HeartHeroScene = {
  html: string;
  css: string;
  /** Seconds this scene needs — longer when it has two callouts to show. */
  lengthSeconds: number;
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

const BASE_SCENE_SECONDS = 5;
const TWO_CALLOUT_SCENE_SECONDS = 6.5;

const COPY = {
  heartAgeLabel: { en: "HEART AGE", ar: "عمر القلب" },
  coronary: {
    title: { en: "Coronary Arteries", ar: "الشرايين التاجية" },
    note: {
      en: "Cholesterol, smoking and diabetes narrow these — the leading cause of heart attacks.",
      ar: "الكولسترول والتدخين والسكري تُضيّقها — السبب الأول للنوبات القلبية.",
    },
  },
  leftVentricle: {
    title: { en: "Left Ventricle & Aorta", ar: "البطين الأيسر والأبهر" },
    note: {
      en: "High blood pressure thickens this wall and strains the aorta over time.",
      ar: "ضغط الدم المرتفع يزيد سماكة هذا الجدار ويُجهد الأبهر مع الوقت.",
    },
  },
  overview: {
    title: { en: "Your Whole Heart", ar: "قلبك بالكامل" },
    note: {
      en: "Four chambers, four valves — the real anatomy behind your number.",
      ar: "أربع حجرات وأربعة صمامات — التشريح الحقيقي خلف رقمك.",
    },
  },
} as const;

function gapSentence(ageGapYears: number, language: "en" | "ar"): string {
  if (language === "ar") {
    if (ageGapYears <= 0) return "بعمرك الحقيقي أو أصغر";
    return `أكبر بـ ${ageGapYears} سنة من عمرك`;
  }

  if (ageGapYears <= 0) return "at or below your actual age";
  return `${ageGapYears} year${ageGapYears === 1 ? "" : "s"} older than you`;
}

function callout(kind: "coronary" | "leftVentricle" | "overview", language: "en" | "ar", dotColor: string) {
  const copy = COPY[kind];

  return `
    <div class="callout ${kind}">
      <span class="callout-dot" style="background:${dotColor}"></span>
      <div class="callout-text">
        <div class="callout-title">${copy.title[language]}</div>
        <div class="callout-note">${copy.note[language]}</div>
      </div>
    </div>
  `.trim();
}

/**
 * A real, labeled four-chamber heart diagram, hand-authored as SVG — not
 * traced from a purchased icon set. The clip-path split of one heart
 * silhouette into a blue left half and a red right half is what produces
 * the septum line for free (the clip boundary IS the septum), rather than
 * drawing chambers as four disconnected boxes.
 */
export function heartDiagramSvg(coronaryActive: boolean, leftVentricleActive: boolean): string {
  const coronaryOpacity = coronaryActive ? 1 : 0.32;
  const lvWallOpacity = leftVentricleActive ? 1 : 0.32;
  const aortaOpacity = leftVentricleActive ? 1 : 0.55;

  return `
    <svg class="diagram" viewBox="-20 -55 240 250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="leftHalf"><rect x="-20" y="-55" width="120" height="250" /></clipPath>
        <clipPath id="rightHalf"><rect x="100" y="-55" width="120" height="250" /></clipPath>
      </defs>

      <!-- great vessels (drawn first, so the heart body sits on top) -->
      <g class="vessel-pulmonary" style="opacity:${leftVentricleActive ? 0.55 : 0.75}">
        <path d="M75,18 C75,-8 58,-20 38,-23" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
        <path d="M38,-23 C23,-25 12,-20 5,-12" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />
        <path d="M38,-23 C44,-30 54,-35 64,-37" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />
      </g>
      <g class="vessel-aorta" style="opacity:${aortaOpacity}">
        <path d="M125,18 C125,-12 142,-28 168,-31 C190,-33 200,-18 200,3 L200,42"
          fill="none" stroke="#f87171" stroke-width="8" stroke-linecap="round" class="aorta-arc" />
        <path d="M170,-31 L170,-46 M182,-32 L184,-47 M193,-27 L198,-40"
          fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      </g>
      <g class="vessel-venous" opacity="0.6">
        <path d="M28,6 L14,-14" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
        <path d="M28,86 L12,102" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
        <path d="M172,6 L188,-10" stroke="#f87171" stroke-width="5" stroke-linecap="round" />
        <path d="M172,86 L190,98" stroke="#f87171" stroke-width="5" stroke-linecap="round" />
      </g>

      <!-- chamber silhouette, split into the two halves by clip-path -->
      <path class="chamber-half" d="${HEART_BODY_PATH}" fill="#1d4ed8" clip-path="url(#leftHalf)" />
      <path class="chamber-half" d="${HEART_BODY_PATH}" fill="#b91c1c" clip-path="url(#rightHalf)" />

      <!-- ventricle wall bands (thicker on the left-ventricle side — real anatomy) -->
      <path class="wall-rv" d="M100,168 C68,150 24,120 14,80" fill="none" stroke="#1e3a8a"
        stroke-width="5" stroke-linecap="round" style="opacity:${lvWallOpacity * 0.7}" />
      <path class="wall-lv${leftVentricleActive ? " wall-lv-active" : ""}" d="M100,168 C132,150 178,118 190,78" fill="none" stroke="#7f1d1d"
        stroke-width="11" stroke-linecap="round" style="opacity:${lvWallOpacity}" />

      <!-- septum -->
      <line x1="100" y1="-2" x2="100" y2="168" stroke="#e2e8f0" stroke-width="1.5" opacity="0.45" />
      <!-- AV valve boundary -->
      <line x1="16" y1="86" x2="184" y2="86" stroke="#e2e8f0" stroke-width="1.5" opacity="0.35" />

      <!-- valve markers -->
      <ellipse cx="84" cy="86" rx="6" ry="3.5" fill="#f8fafc" opacity="0.9" />
      <ellipse cx="116" cy="86" rx="6" ry="3.5" fill="#f8fafc" opacity="0.9" />
      <ellipse cx="75" cy="16" rx="5" ry="3" fill="#f8fafc" opacity="0.9" />
      <ellipse cx="125" cy="16" rx="5" ry="3" fill="#f8fafc" opacity="0.9" />

      <!-- coronary arteries, on the ventricle surface -->
      <g class="coronary" style="opacity:${coronaryOpacity}">
        <path d="M100,90 C100,112 97,140 88,166" fill="none" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" />
        <path d="M38,84 C24,102 19,128 33,158" fill="none" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" />
        <path d="M162,84 C178,98 181,120 170,144" fill="none" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" />
        <circle class="plaque" cx="96" cy="118" r="4.5" fill="#ef4444" />
        <circle class="plaque" cx="28" cy="122" r="4.5" fill="#ef4444" />
        <circle class="plaque" cx="174" cy="112" r="4.5" fill="#ef4444" />
      </g>

      <!-- chamber labels -->
      <text x="45" y="50" class="chamber-label">RA</text>
      <text x="45" y="132" class="chamber-label">RV</text>
      <text x="155" y="50" class="chamber-label">LA</text>
      <text x="155" y="132" class="chamber-label">LV</text>
    </svg>
  `.trim();
}

// A rounded, symmetric heart-body outline (two lobes meeting a bottom
// apex) — the container that clip-path splits into the blue/red halves.
const HEART_BODY_PATH =
  "M100,168 C55,140 8,105 8,58 C8,22 35,-2 65,-2 C82,-2 95,8 100,22 C105,8 118,-2 135,-2 C165,-2 192,22 192,58 C192,105 145,140 100,168 Z";

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
  const heartAgeLabel = COPY.heartAgeLabel[language];
  const gap = gapSentence(input.ageGapYears, language);
  const dir = language === "ar" ? "rtl" : "ltr";

  const callouts: string[] = [];
  if (input.focus.coronaryArteries) callouts.push(callout("coronary", language, "#fbbf24"));
  if (input.focus.leftVentricleAndAorta) callouts.push(callout("leftVentricle", language, "#7f1d1d"));
  if (callouts.length === 0) callouts.push(callout("overview", language, color));

  const lengthSeconds = callouts.length > 1 ? TWO_CALLOUT_SCENE_SECONDS : BASE_SCENE_SECONDS;

  const html = `
    <div class="scene" dir="${dir}">
      <div class="diagram-panel">
        ${heartDiagramSvg(input.focus.coronaryArteries, input.focus.leftVentricleAndAorta)}
      </div>
      <div class="info-panel">
        <div class="label">${heartAgeLabel}</div>
        <div class="number">${input.heartAge}</div>
        <div class="gap">${gap}</div>
        <div class="badge" style="border-color:${color};color:${color};">${riskLabel}</div>
        <div class="callouts">
          ${callouts.join("\n")}
        </div>
      </div>
    </div>
  `.trim();

  const css = `
    ${ARABIC_FONT_FACE_CSS}
    body { margin: 0; background: #061826; }
    .scene {
      width: 1280px;
      height: 720px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 64px;
      font-family: 'Montserrat', 'Cairo', Arial, sans-serif;
      background: radial-gradient(circle at 30% 40%, rgba(20,184,166,0.14), transparent 55%), #061826;
    }
    .diagram-panel {
      opacity: 0;
      animation: fadeIn 0.7s ease-out 0.1s forwards;
    }
    .diagram { width: 440px; height: auto; }
    .chamber-half { opacity: 0.92; }
    .wall-lv-active {
      filter: drop-shadow(0 0 5px rgba(248,113,113,0.95));
      animation: wallGlow 1.8s ease-in-out 1s infinite;
    }
    @keyframes wallGlow {
      0%, 100% { stroke: #7f1d1d; }
      50% { stroke: #f87171; }
    }
    .plaque { opacity: 0; }
    .coronary[style*="opacity:1"] .plaque {
      animation: plaquePulse 1.3s ease-in-out 1s infinite;
    }
    .chamber-label {
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 15px;
      font-weight: 800;
      fill: #f8fafc;
      opacity: 0.75;
      text-anchor: middle;
    }
    @keyframes plaquePulse {
      0%, 100% { opacity: 0.55; r: 4.5; }
      50% { opacity: 1; r: 6; }
    }
    .info-panel {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 480px;
    }
    [dir="rtl"] .info-panel { align-items: flex-end; text-align: right; }
    .label {
      color: #d1fae5;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.12em;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 0.4s forwards;
    }
    .number {
      color: #ffffff;
      font-size: 128px;
      font-weight: 900;
      line-height: 1;
      transform: scale(0.6);
      opacity: 0;
      animation: popIn 0.6s cubic-bezier(0.2, 0.8, 0.3, 1.4) 0.6s forwards;
    }
    .gap {
      margin-top: 6px;
      color: #94a3b8;
      font-size: 23px;
      font-weight: 700;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 1.0s forwards;
    }
    .badge {
      margin-top: 18px;
      padding: 7px 20px;
      border: 2px solid;
      border-radius: 999px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.06em;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 1.3s forwards;
    }
    .callouts {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 24px;
      width: 100%;
    }
    .callout {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 16px;
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      opacity: 0;
      animation: slideIn 0.6s ease-out 1.7s forwards;
    }
    .callout:nth-of-type(2) { animation-delay: 2.4s; }
    .callout-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      margin-top: 4px;
      flex: none;
    }
    .callout-title {
      color: #ffffff;
      font-size: 16px;
      font-weight: 800;
    }
    .callout-note {
      margin-top: 2px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.6); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `.trim();

  return { html, css, lengthSeconds };
}
