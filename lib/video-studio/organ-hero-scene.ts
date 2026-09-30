import type { LabMarkerStatus } from "@/lib/labMarkerDetector";
import { heartDiagramSvg } from "@/lib/video-studio/heart-hero-scene";
import type { OrganStructure, ReportOrgan, ReportOrganFocus } from "@/lib/video-studio/report-organ-focus";
import { ARABIC_FONT_FACE_CSS } from "@/lib/video-studio/video-fonts";

// Our own motion graphics for the personal report video: a labeled diagram
// of the organ the member's own report is about (see report-organ-focus.ts),
// rendered by Shotstack's html5 asset like heart-hero-scene.ts. Hand-authored
// SVG in the same simplified patient-education style as the heart diagram —
// not stock footage, not a traced icon set.
//
// Two scenes per organ:
// - the hero, which opens the video: the diagram beside the member's actual
//   values for that organ, exactly as detected in their report;
// - the backdrop, the same diagram alone and dimmed, which stays behind the
//   narrated scenes so the organ is on screen the whole time.
//
// Only structures an OUT-OF-RANGE value from the report points to light up.
// Nothing here is a diagnosis: the notes explain what each marker measures.

type Language = "en" | "ar";
type Localized = { en: string; ar: string };

export type OrganScene = {
  html: string;
  css: string;
  lengthSeconds: number;
};

export const ORGAN_HERO_SECONDS = 6.5;
export const MAX_MARKERS_SHOWN = 4;

const ORGAN_NAME: Record<ReportOrgan, Localized> = {
  heart: { en: "Heart & Arteries", ar: "القلب والشرايين" },
  liver: { en: "Liver", ar: "الكبد" },
  kidney: { en: "Kidney", ar: "الكلية" },
  thyroid: { en: "Thyroid", ar: "الغدة الدرقية" },
  blood: { en: "Blood", ar: "الدم" },
  pancreas: { en: "Pancreas", ar: "البنكرياس" },
};

const STRUCTURE_COPY: Record<OrganStructure, { title: Localized; note: Localized }> = {
  coronaryArteries: {
    title: { en: "Coronary Arteries", ar: "الشرايين التاجية" },
    note: {
      en: "Cholesterol and triglycerides can build up in these artery walls over time.",
      ar: "الكولسترول والدهون الثلاثية قد تتراكم في جدران هذه الشرايين مع الوقت.",
    },
  },
  liverCells: {
    title: { en: "Liver Cells", ar: "خلايا الكبد" },
    note: {
      en: "ALT and AST come from liver cells, and albumin is made by them.",
      ar: "إنزيما ALT وAST يخرجان من خلايا الكبد، والألبومين تصنعه هذه الخلايا.",
    },
  },
  bileDucts: {
    title: { en: "Bile Ducts", ar: "القنوات الصفراوية" },
    note: {
      en: "ALP and bilirubin reflect how bile drains out of the liver.",
      ar: "ALP والبيليروبين يعكسان تصريف العصارة الصفراوية من الكبد.",
    },
  },
  filters: {
    title: { en: "Kidney Filters", ar: "مرشّحات الكلية" },
    note: {
      en: "Creatinine, urea and eGFR show how well these tiny filters clean the blood.",
      ar: "الكرياتينين واليوريا وeGFR تبيّن مدى كفاءة هذه المرشّحات الدقيقة في تنقية الدم.",
    },
  },
  thyroidGland: {
    title: { en: "Thyroid Gland", ar: "الغدة الدرقية" },
    note: {
      en: "TSH from the brain signals this gland; FT4 is the hormone it makes.",
      ar: "هرمون TSH من الدماغ يوجّه هذه الغدة، وFT4 هو الهرمون الذي تفرزه.",
    },
  },
  redCells: {
    title: { en: "Red Blood Cells", ar: "خلايا الدم الحمراء" },
    note: {
      en: "Hemoglobin inside them carries oxygen; ferritin is the iron stored to make it.",
      ar: "الهيموغلوبين داخلها يحمل الأكسجين، والفيريتين مخزون الحديد اللازم لصنعه.",
    },
  },
  whiteCells: {
    title: { en: "White Blood Cells", ar: "خلايا الدم البيضاء" },
    note: { en: "They defend the body against infection.", ar: "تدافع عن الجسم ضد العدوى." },
  },
  platelets: {
    title: { en: "Platelets", ar: "الصفائح الدموية" },
    note: {
      en: "They help blood clot when a vessel is injured.",
      ar: "تساعد الدم على التجلّط عند إصابة الوعاء.",
    },
  },
  islets: {
    title: { en: "Islet Cells", ar: "جزر البنكرياس" },
    note: {
      en: "They release insulin, which controls blood sugar (glucose, HbA1c).",
      ar: "تفرز الإنسولين الذي ينظّم سكر الدم (الغلوكوز وHbA1c).",
    },
  },
};

const OVERVIEW_NOTE: Localized = {
  en: "Every value shown here comes from your own report.",
  ar: "كل القيم المعروضة هنا من تقريرك أنت.",
};

const FROM_REPORT: Localized = { en: "FROM YOUR REPORT", ar: "من تقريرك" };

const STATUS: Record<LabMarkerStatus, { label: Localized; color: string }> = {
  High: { label: { en: "HIGH", ar: "مرتفع" }, color: "#f87171" },
  Low: { label: { en: "LOW", ar: "منخفض" }, color: "#fbbf24" },
  Normal: { label: { en: "IN RANGE", ar: "ضمن المعدل" }, color: "#2dd4bf" },
  Detected: { label: { en: "REPORTED", ar: "مذكور" }, color: "#94a3b8" },
};

const LABELS = {
  rightLobe: { en: "Right lobe", ar: "الفص الأيمن" },
  leftLobe: { en: "Left lobe", ar: "الفص الأيسر" },
  gallbladder: { en: "Gallbladder", ar: "المرارة" },
  bileDuct: { en: "Bile duct", ar: "القناة الصفراوية" },
  cortex: { en: "Cortex", ar: "القشرة" },
  medulla: { en: "Medulla", ar: "اللب" },
  pelvis: { en: "Renal pelvis", ar: "حوض الكلية" },
  ureter: { en: "Ureter", ar: "الحالب" },
  isthmus: { en: "Isthmus", ar: "البرزخ" },
  trachea: { en: "Trachea", ar: "القصبة الهوائية" },
  redCells: { en: "Red cells", ar: "خلايا حمراء" },
  whiteCell: { en: "White cell", ar: "خلية بيضاء" },
  platelets: { en: "Platelets", ar: "صفائح" },
  head: { en: "Head", ar: "الرأس" },
  body: { en: "Body", ar: "الجسم" },
  tail: { en: "Tail", ar: "الذيل" },
  islets: { en: "Islets", ar: "الجزر" },
} satisfies Record<string, Localized>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * How a structure is drawn: lit and pulsing when the report points to it,
 * receded when something else is lit, and plain when nothing is.
 */
function emphasis(active: Set<OrganStructure>, structure: OrganStructure): string {
  if (active.has(structure)) {
    return `class="lit" style="opacity:1"`;
  }

  return `style="opacity:${active.size > 0 ? 0.4 : 0.9}"`;
}

function label(x: number, y: number, text: Localized, language: Language, anchor = "middle"): string {
  return `<text x="${x}" y="${y}" class="organ-label" text-anchor="${anchor}">${text[language]}</text>`;
}

function liverSvg(active: Set<OrganStructure>, language: Language): string {
  const body =
    "M14,78 C10,42 48,22 104,20 C160,18 214,26 244,44 C252,49 250,58 240,62 C204,76 170,92 142,114 C118,134 96,160 66,166 C36,172 16,140 14,78 Z";
  const cells = [];

  for (let y = 36; y < 166; y += 16) {
    for (let x = 22; x < 244; x += 16) {
      cells.push(`<circle cx="${x + ((y / 16) % 2) * 8}" cy="${y}" r="2.6" />`);
    }
  }

  return `
    <svg class="diagram" viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="liverClip"><path d="${body}" /></clipPath></defs>
      <rect x="104" y="0" width="16" height="44" rx="6" fill="#3b82f6" opacity="0.7" />
      <path d="${body}" fill="#8b3a2e" />
      <g ${emphasis(active, "liverCells")}>
        <path d="${body}" fill="#b4533a" />
        <g clip-path="url(#liverClip)" fill="#f3b199">${cells.join("")}</g>
      </g>
      <path d="M150,20 C146,50 140,82 136,116" fill="none" stroke="#fde2d6" stroke-width="1.6" opacity="0.6" />
      <path d="M128,212 L126,150 C126,140 124,134 120,128" fill="none" stroke="#8b5cf6" stroke-width="7" stroke-linecap="round" />
      <path d="M140,212 C138,172 132,148 124,134" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      <g ${emphasis(active, "bileDucts")}>
        <path d="M78,138 C70,152 74,176 90,180 C104,183 110,168 104,150 C100,140 88,132 78,138 Z" fill="#65a30d" />
        <path d="M58,92 C80,102 96,114 112,128 M192,62 C166,80 138,102 114,126 M112,128 L112,212 M102,152 C106,154 109,156 112,158"
          fill="none" stroke="#bef264" stroke-width="3.4" stroke-linecap="round" />
      </g>
      ${label(62, 70, LABELS.rightLobe, language)}
      ${label(196, 50, LABELS.leftLobe, language)}
      ${label(62, 200, LABELS.gallbladder, language)}
      ${label(170, 190, LABELS.bileDuct, language)}
    </svg>
  `.trim();
}

function kidneySvg(active: Set<OrganStructure>, language: Language): string {
  const glomeruli = [
    [96, 24], [136, 26], [62, 38], [40, 70], [32, 104], [32, 142], [42, 178], [62, 208], [96, 226], [136, 226],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" />`)
    .join("");

  return `
    <svg class="diagram" viewBox="0 0 260 250" xmlns="http://www.w3.org/2000/svg">
      <path d="M112,12 C52,12 22,64 22,122 C22,182 58,236 116,236 C156,236 172,208 166,180 C160,158 140,148 140,124 C140,100 160,90 166,66 C172,38 154,12 112,12 Z" fill="#8f2d2d" />
      <path d="M112,36 C68,36 46,78 46,122 C46,168 72,212 114,212 C138,212 148,196 144,178 C140,162 124,150 124,124 C124,98 140,86 144,70 C148,52 136,36 112,36 Z" fill="#b4533a" />
      <g fill="#6f1d1b">
        <path d="M64,70 L96,60 L116,106 Z" />
        <path d="M52,118 L86,104 L114,122 Z" />
        <path d="M60,172 L92,158 L114,138 Z" />
        <path d="M94,202 L122,194 L120,148 Z" />
      </g>
      <path d="M254,106 L150,114" stroke="#ef4444" stroke-width="7" stroke-linecap="round" />
      <path d="M254,134 L150,130" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" />
      <path d="M116,96 C126,92 138,100 142,112 L150,124 L142,136 C138,148 126,156 116,152 C122,140 124,128 122,122 C124,114 122,104 116,96 Z" fill="#fcd34d" />
      <path d="M146,136 C160,162 168,204 174,250" fill="none" stroke="#fcd34d" stroke-width="7" stroke-linecap="round" />
      <g fill="#fde68a" ${emphasis(active, "filters")}>${glomeruli}</g>
      ${label(40, 18, LABELS.cortex, language)}
      ${label(80, 132, LABELS.medulla, language)}
      ${label(206, 160, LABELS.pelvis, language)}
      ${label(210, 232, LABELS.ureter, language)}
    </svg>
  `.trim();
}

function thyroidSvg(active: Set<OrganStructure>, language: Language): string {
  const rings = [];

  for (let y = 52; y < 236; y += 16) {
    rings.push(`<path d="M108,${y} Q130,${y + 6} 152,${y}" />`);
  }

  return `
    <svg class="diagram" viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="108" y="40" width="44" height="200" rx="10" fill="#cbd5e1" opacity="0.22" />
      <g fill="none" stroke="#cbd5e1" stroke-width="2" opacity="0.5">${rings.join("")}</g>
      <path d="M96,6 L164,6 L156,44 L130,58 L104,44 Z" fill="#cbd5e1" opacity="0.3" />
      <g fill="#be185d" ${emphasis(active, "thyroidGland")}>
        <path d="M112,90 C88,70 60,86 58,122 C56,162 70,198 92,202 C108,205 116,182 116,162 L116,140 Z" />
        <path d="M148,90 C172,70 200,86 202,122 C204,162 190,198 168,202 C152,205 144,182 144,162 L144,140 Z" />
        <rect x="110" y="136" width="40" height="26" rx="10" />
      </g>
      ${label(40, 80, LABELS.rightLobe, language)}
      ${label(220, 80, LABELS.leftLobe, language)}
      ${label(130, 186, LABELS.isthmus, language)}
      ${label(130, 234, LABELS.trachea, language)}
    </svg>
  `.trim();
}

function bloodSvg(active: Set<OrganStructure>, language: Language): string {
  const redCells = [
    [30, 70], [78, 100], [128, 64], [176, 110], [226, 72], [44, 150], [104, 160], [214, 158], [150, 150],
  ]
    .map(
      ([x, y]) =>
        `<ellipse cx="${x}" cy="${y}" rx="17" ry="12" fill="#dc2626" /><ellipse cx="${x}" cy="${y}" rx="7" ry="4.5" fill="#991b1b" />`
    )
    .join("");
  const whiteCells = [[100, 118], [196, 64]]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="20" fill="#ede9fe" /><path d="M${x - 9},${y - 3} q5,-9 10,0 q5,9 10,0" fill="none" stroke="#7e22ce" stroke-width="6" stroke-linecap="round" />`
    )
    .join("");
  const platelets = [[58, 112], [150, 100], [240, 120], [128, 176], [20, 118], [180, 172]]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.4" fill="#fbbf24" />`)
    .join("");

  return `
    <svg class="diagram" viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="36" width="260" height="160" fill="#2a0a12" />
      <path d="M0,36 L260,36 M0,196 L260,196" stroke="#9f1239" stroke-width="8" />
      <g ${emphasis(active, "redCells")}>${redCells}</g>
      <g ${emphasis(active, "whiteCells")}>${whiteCells}</g>
      <g ${emphasis(active, "platelets")}>${platelets}</g>
      ${label(60, 22, LABELS.redCells, language)}
      ${label(200, 22, LABELS.whiteCell, language)}
      ${label(130, 216, LABELS.platelets, language)}
    </svg>
  `.trim();
}

function pancreasSvg(active: Set<OrganStructure>, language: Language): string {
  const islets = [[66, 110], [96, 130], [132, 108], [168, 92], [204, 76], [226, 64]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" />`)
    .join("");

  return `
    <svg class="diagram" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M64,28 C22,38 14,110 30,150 C44,182 86,186 104,166" fill="none" stroke="#f9a8b4" stroke-width="16" stroke-linecap="round" opacity="0.75" />
      <path d="M52,70 C40,90 44,140 70,150 C92,156 104,138 120,130 C150,116 190,104 222,88 C240,80 246,62 234,56 C214,48 180,62 150,72 C120,82 96,90 84,80 C76,72 64,62 52,70 Z" fill="#e8a54b" />
      <path d="M70,122 C100,112 150,96 228,66" fill="none" stroke="#fde68a" stroke-width="2.5" />
      <g fill="#fb7185" ${emphasis(active, "islets")}>${islets}</g>
      ${label(56, 186, LABELS.head, language)}
      ${label(146, 138, LABELS.body, language)}
      ${label(232, 40, LABELS.tail, language)}
      ${label(150, 30, LABELS.islets, language)}
    </svg>
  `.trim();
}

export function organDiagramSvg(focus: ReportOrganFocus, language: Language): string {
  const active = new Set(focus.highlighted);

  switch (focus.organ) {
    case "heart":
      return heartDiagramSvg(active.has("coronaryArteries"), false);
    case "liver":
      return liverSvg(active, language);
    case "kidney":
      return kidneySvg(active, language);
    case "thyroid":
      return thyroidSvg(active, language);
    case "blood":
      return bloodSvg(active, language);
    case "pancreas":
      return pancreasSvg(active, language);
  }
}

function markerRow(marker: ReportOrganFocus["markers"][number], language: Language): string {
  const status = STATUS[marker.status];

  return `
    <div class="marker">
      <span class="marker-name"><bdi>${escapeHtml(marker.name)}</bdi></span>
      <span class="marker-value"><bdi dir="ltr">${escapeHtml(String(marker.value))} ${escapeHtml(marker.unit)}</bdi></span>
      <span class="marker-status" style="color:${status.color};border-color:${status.color}">${status.label[language]}</span>
    </div>
  `.trim();
}

function callout(focus: ReportOrganFocus, language: Language): string {
  const structure = focus.highlighted[0];
  const title = structure ? STRUCTURE_COPY[structure].title[language] : ORGAN_NAME[focus.organ][language];
  const note = structure ? STRUCTURE_COPY[structure].note[language] : OVERVIEW_NOTE[language];

  return `
    <div class="callout">
      <div class="callout-title">${title}</div>
      <div class="callout-note">${note}</div>
    </div>
  `.trim();
}

const SHARED_CSS = `
  ${ARABIC_FONT_FACE_CSS}
  body { margin: 0; background: #061826; }
  .scene {
    width: 1280px;
    height: 720px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Montserrat', 'Cairo', Arial, sans-serif;
    background: radial-gradient(circle at 30% 40%, rgba(20,184,166,0.14), transparent 55%), #061826;
  }
  [dir="rtl"] .scene, .scene[dir="rtl"] { font-family: 'Cairo', Arial, sans-serif; }
  .organ-label { font-size: 11px; font-weight: 700; fill: #f1f5f9; paint-order: stroke; stroke: #061826; stroke-width: 3px; stroke-linejoin: round; }
  .chamber-label { font-size: 15px; font-weight: 800; fill: #f8fafc; opacity: 0.75; text-anchor: middle; }
  .coronary[style*="opacity:1"] .plaque { opacity: 1; }
  .plaque { opacity: 0; }
  .lit {
    filter: drop-shadow(0 0 6px rgba(253,224,71,0.9));
    animation: pulse 1.6s ease-in-out 0.9s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

/**
 * The opening scene: the organ diagram beside the member's own values for
 * that organ. Pure (no network) — see tests/organ-hero-scene.test.ts.
 */
export function buildOrganHeroScene(focus: ReportOrganFocus, language: Language = "en"): OrganScene {
  const dir = language === "ar" ? "rtl" : "ltr";
  const rows = focus.markers.slice(0, MAX_MARKERS_SHOWN).map((marker) => markerRow(marker, language));

  const html = `
    <div class="scene hero" dir="${dir}">
      <div class="diagram-panel">${organDiagramSvg(focus, language)}</div>
      <div class="info-panel">
        <div class="label">${FROM_REPORT[language]}</div>
        <div class="organ-name">${ORGAN_NAME[focus.organ][language]}</div>
        <div class="markers">${rows.join("\n")}</div>
        ${callout(focus, language)}
      </div>
    </div>
  `.trim();

  const css = `
    ${SHARED_CSS}
    .hero { gap: 64px; }
    .diagram-panel { opacity: 0; animation: fadeIn 0.7s ease-out 0.1s forwards; }
    .diagram { width: 440px; height: auto; }
    .info-panel { display: flex; flex-direction: column; align-items: flex-start; max-width: 520px; }
    [dir="rtl"] .info-panel { align-items: flex-end; text-align: right; }
    .label { color: #99f6e4; font-size: 18px; font-weight: 800; letter-spacing: 0.12em; opacity: 0; animation: fadeIn 0.6s ease-out 0.4s forwards; }
    .organ-name { color: #ffffff; font-size: 56px; font-weight: 900; line-height: 1.15; opacity: 0; animation: fadeIn 0.6s ease-out 0.6s forwards; }
    .markers { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; width: 100%; opacity: 0; animation: fadeIn 0.6s ease-out 1.0s forwards; }
    .marker { display: flex; align-items: center; gap: 14px; padding: 8px 14px; border-radius: 10px; background: rgba(255,255,255,0.06); }
    .marker-name { color: #ffffff; font-size: 20px; font-weight: 800; min-width: 130px; }
    .marker-value { color: #cbd5e1; font-size: 20px; font-weight: 600; flex: 1; }
    .marker-status { font-size: 14px; font-weight: 800; letter-spacing: 0.06em; padding: 3px 12px; border: 2px solid; border-radius: 999px; }
    .callout { margin-top: 18px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); opacity: 0; animation: fadeIn 0.6s ease-out 1.8s forwards; }
    .callout-title { color: #fde68a; font-size: 18px; font-weight: 800; }
    .callout-note { margin-top: 4px; color: #94a3b8; font-size: 15px; font-weight: 500; line-height: 1.45; }
  `.trim();

  return { html, css, lengthSeconds: ORGAN_HERO_SECONDS };
}

/**
 * The same diagram alone, larger and dimmed, for behind the narrated scenes
 * — captions stay readable over it while the organ never leaves the screen.
 */
export function buildOrganBackdropScene(
  focus: ReportOrganFocus,
  language: Language,
  lengthSeconds: number
): OrganScene {
  const html = `
    <div class="scene backdrop" dir="${language === "ar" ? "rtl" : "ltr"}">
      <div class="diagram-panel">${organDiagramSvg(focus, language)}</div>
    </div>
  `.trim();

  const css = `
    ${SHARED_CSS}
    .backdrop { align-items: flex-start; padding-top: 36px; box-sizing: border-box; }
    .diagram-panel { opacity: 0.55; }
    .diagram { width: 520px; height: auto; }
  `.trim();

  return { html, css, lengthSeconds };
}
