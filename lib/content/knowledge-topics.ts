// A curated rotation of health-education topics for the AI knowledge-hub
// pipeline (see lib/content/article-generation.service.ts). Kept as a plain
// list rather than something dynamic so every topic is one a clinician would
// recognise as reasonable, safe, and non-diagnostic to write about.
//
// Categories intentionally reuse the English category names already used by
// the built-in articles (lib/blogData.ts) and the admin article form, so a
// generated article lines up with the site's existing filters.
export type KnowledgeTopic = {
  // Used only to pick the next topic and to avoid regenerating the same
  // subject; never shown to a reader.
  key: string;
  topic: string;
  category: string;
  categoryAr: string;
  labMarkers: string[];
  // A short, literal, stock-photo-friendly search phrase for the cover image
  // (see lib/content/article-image.client.ts) — deliberately not the topic
  // sentence itself, which searches poorly.
  imageQuery: string;
};

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  { key: "vitamin-d", topic: "What a Vitamin D result means and who tends to run low", category: "Nutrition", categoryAr: "التغذية", labMarkers: ["Vitamin D"], imageQuery: "sunlight healthy skin" },
  { key: "thyroid-tsh", topic: "How TSH reflects thyroid function and why one number isn't the whole picture", category: "Endocrine Health", categoryAr: "الغدد الصماء", labMarkers: ["TSH", "T4"], imageQuery: "medical laboratory blood test" },
  { key: "iron-ferritin", topic: "Ferritin vs. hemoglobin: two different ways of looking at iron", category: "Blood Health", categoryAr: "صحة الدم", labMarkers: ["Ferritin", "Hemoglobin"], imageQuery: "red blood cells iron rich food" },
  { key: "kidney-egfr", topic: "What eGFR and creatinine together say about kidney function", category: "Kidney Health", categoryAr: "صحة الكلى", labMarkers: ["eGFR", "Creatinine"], imageQuery: "kidney health water glass" },
  { key: "liver-alt-ast", topic: "ALT and AST: why liver enzymes rise and what usually explains it", category: "Liver Health", categoryAr: "صحة الكبد", labMarkers: ["ALT", "AST"], imageQuery: "liver anatomy model doctor" },
  { key: "hba1c-glucose", topic: "HbA1c vs. fasting glucose: two windows into blood sugar", category: "Metabolic Health", categoryAr: "الصحة الأيضية", labMarkers: ["HbA1c", "Glucose"], imageQuery: "blood sugar glucose meter" },
  { key: "cholesterol-panel", topic: "Reading a full lipid panel beyond just 'good' and 'bad' cholesterol", category: "Heart Health", categoryAr: "صحة القلب", labMarkers: ["LDL", "HDL", "Triglycerides"], imageQuery: "heart health stethoscope" },
  { key: "vitamin-b12", topic: "Vitamin B12 and why deficiency is often missed early", category: "Nutrition", categoryAr: "التغذية", labMarkers: ["Vitamin B12"], imageQuery: "healthy meal vegetables meat" },
  { key: "electrolytes", topic: "Sodium and potassium: what an electrolyte panel is actually checking", category: "General Health", categoryAr: "الصحة العامة", labMarkers: ["Sodium", "Potassium"], imageQuery: "bananas fruits vegetables potassium" },
  { key: "cbc-basics", topic: "How to read a complete blood count without panicking over one flagged value", category: "Blood Health", categoryAr: "صحة الدم", labMarkers: ["WBC", "Hemoglobin", "Platelets"], imageQuery: "blood test tubes laboratory" },
  { key: "blood-pressure-numbers", topic: "What the two blood pressure numbers each represent", category: "Heart Health", categoryAr: "صحة القلب", labMarkers: [], imageQuery: "blood pressure monitor arm" },
  { key: "inflammation-crp", topic: "CRP and inflammation: a useful but nonspecific signal", category: "General Health", categoryAr: "الصحة العامة", labMarkers: ["CRP"], imageQuery: "doctor reviewing lab results" },
  { key: "uric-acid-gout", topic: "Uric acid, gout, and what a high result does and doesn't mean", category: "Kidney Health", categoryAr: "صحة الكلى", labMarkers: ["Uric Acid"], imageQuery: "foot joint pain elderly" },
  { key: "sleep-and-recovery", topic: "How consistent sleep timing supports recovery and metabolic health", category: "General Health", categoryAr: "الصحة العامة", labMarkers: [], imageQuery: "person sleeping bedroom night" },
  { key: "hydration-basics", topic: "Everyday hydration: signs, myths, and what actually helps", category: "Nutrition", categoryAr: "التغذية", labMarkers: [], imageQuery: "drinking water glass" },
  { key: "walking-cardio", topic: "Why regular walking measurably helps cardiovascular markers over time", category: "Heart Health", categoryAr: "صحة القلب", labMarkers: [], imageQuery: "person walking outdoors exercise" },
  { key: "protein-basics", topic: "How much dietary protein people actually need, and common myths", category: "Nutrition", categoryAr: "التغذية", labMarkers: [], imageQuery: "grilled chicken eggs protein food" },
  { key: "stress-cortisol", topic: "Cortisol and chronic stress: what the science actually supports", category: "General Health", categoryAr: "الصحة العامة", labMarkers: ["Cortisol"], imageQuery: "person relaxing calm stress relief" },
  { key: "magnesium", topic: "Magnesium's role in the body and who is commonly low", category: "Nutrition", categoryAr: "التغذية", labMarkers: ["Magnesium"], imageQuery: "nuts seeds leafy greens" },
  { key: "anemia-causes", topic: "Common causes of anemia and how lab results help narrow them down", category: "Blood Health", categoryAr: "صحة الدم", labMarkers: ["Hemoglobin", "Ferritin", "MCV"], imageQuery: "tired person resting pale" },
];

// Everything already published, by matching either the built-in slug/title
// set or a previously generated topic key, so the rotation never repeats a
// subject while there are untouched ones left.
export function pickNextTopic(
  usedKeys: ReadonlySet<string>
): KnowledgeTopic {
  const untouched = KNOWLEDGE_TOPICS.filter((candidate) => !usedKeys.has(candidate.key));

  if (untouched.length > 0) {
    return untouched[0];
  }

  // Every topic has been covered at least once — start the rotation over
  // rather than refusing to generate anything.
  return KNOWLEDGE_TOPICS[0];
}
