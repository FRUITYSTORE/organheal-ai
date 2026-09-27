// Curated, embeddable health videos from established public-health and
// medical organisations. Every id was checked against YouTube's oEmbed
// endpoint (the channel name is recorded in `source`), and none of them is a
// personal or commercial channel. Videos are English-language; Arabic readers
// get an Arabic title, a short description, and YouTube's own captions.
//
// Adding a video: confirm the channel is an official health body, confirm it
// embeds (oEmbed returns 200), then add it here with its topic.

export type VideoTopicKey =
  | "diabetes"
  | "cholesterol"
  | "blood-pressure"
  | "kidney"
  | "liver"
  | "vitamin-d";

export type VideoTopic = {
  key: VideoTopicKey;
  label: { en: string; ar: string };
  // Lower-case fragments searched for in a question or a lab-marker name.
  keywords: string[];
};

export type HealthVideo = {
  youtubeId: string;
  topic: VideoTopicKey;
  title: { en: string; ar: string };
  source: string;
};

export const VIDEO_TOPICS: VideoTopic[] = [
  {
    key: "diabetes",
    label: { en: "Diabetes", ar: "السكري" },
    keywords: [
      "diabet",
      "blood sugar",
      "glucose",
      "hba1c",
      "a1c",
      "insulin",
      "سكر",
      "الجلوكوز",
      "انسولين",
      "إنسولين",
    ],
  },
  {
    key: "cholesterol",
    label: { en: "Cholesterol", ar: "الكوليسترول" },
    keywords: [
      "cholesterol",
      "ldl",
      "hdl",
      "triglyceride",
      "lipid",
      "كوليسترول",
      "كولسترول",
      "دهون ثلاثية",
      "الدهون",
    ],
  },
  {
    key: "blood-pressure",
    label: { en: "Blood pressure", ar: "ضغط الدم" },
    keywords: [
      "blood pressure",
      "hypertension",
      "bp ",
      "ضغط",
      "الضغط",
    ],
  },
  {
    key: "kidney",
    label: { en: "Kidneys", ar: "الكلى" },
    keywords: [
      "kidney",
      "renal",
      "creatinine",
      "egfr",
      "urea",
      "كلى",
      "الكلى",
      "كلية",
      "كرياتينين",
    ],
  },
  {
    key: "liver",
    label: { en: "Liver", ar: "الكبد" },
    keywords: [
      "liver",
      "hepat",
      "fatty liver",
      "alt ",
      "ast ",
      "bilirubin",
      "masld",
      "nafld",
      "كبد",
      "الكبد",
    ],
  },
  {
    key: "vitamin-d",
    label: { en: "Vitamin D", ar: "فيتامين د" },
    keywords: ["vitamin d", "vit d", "25-oh", "فيتامين د", "فيتامين دال"],
  },
];

export const HEALTH_VIDEOS: HealthVideo[] = [
  {
    youtubeId: "wmOW091P2ew",
    topic: "diabetes",
    title: { en: "What is diabetes?", ar: "ما هو السكري؟" },
    source: "Centers for Disease Control and Prevention (CDC)",
  },
  {
    youtubeId: "2TWelC6SHr8",
    topic: "diabetes",
    title: {
      en: "What is diabetes? (NIDDK)",
      ar: "ما هو السكري؟ (المعهد الوطني الأمريكي)",
    },
    source: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)",
  },
  {
    youtubeId: "Kp6Jk9vsqkM",
    topic: "diabetes",
    title: {
      en: "Diabetes: a patient's view",
      ar: "السكري من وجهة نظر المريض",
    },
    source: "World Health Organization (WHO)",
  },
  {
    youtubeId: "ZLOjD5IfUyU",
    topic: "diabetes",
    title: { en: "What is diabetes? (Diabetes UK)", ar: "ما هو السكري؟ (السكري في بريطانيا)" },
    source: "Diabetes UK",
  },
  {
    youtubeId: "8uFH_Ak-ORI",
    topic: "cholesterol",
    title: { en: "Understanding cholesterol", ar: "فهم الكوليسترول" },
    source: "British Heart Foundation",
  },
  {
    youtubeId: "FdF9Xzr2sPg",
    topic: "blood-pressure",
    title: {
      en: "What you need to know about high blood pressure",
      ar: "ما تحتاج معرفته عن ارتفاع ضغط الدم",
    },
    source: "Centers for Disease Control and Prevention (CDC)",
  },
  {
    youtubeId: "cuLH7SyWXFk",
    topic: "blood-pressure",
    title: { en: "Understanding blood pressure", ar: "فهم ضغط الدم" },
    source: "British Heart Foundation",
  },
  {
    youtubeId: "za78Uqroios",
    topic: "kidney",
    title: {
      en: "What is kidney disease?",
      ar: "ما هو مرض الكلى؟ وعلاقته بالقلب والسكري",
    },
    source: "National Kidney Foundation",
  },
  {
    youtubeId: "y-g26aLjLK0",
    topic: "kidney",
    title: {
      en: "Chronic kidney disease: what it is and what causes it",
      ar: "مرض الكلى المزمن: ما هو وما أسبابه",
    },
    source: "NHS England",
  },
  {
    youtubeId: "INresa0pw0w",
    topic: "kidney",
    title: {
      en: "Chronic kidney disease: hope through research",
      ar: "مرض الكلى المزمن: الأمل عبر الأبحاث",
    },
    source: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)",
  },
  {
    youtubeId: "gZQ3VFHq17E",
    topic: "liver",
    title: {
      en: "The stages of fatty liver disease (NAFLD)",
      ar: "مراحل الكبد الدهني",
    },
    source: "Liver UK",
  },
  {
    youtubeId: "s6XyM_gXH-U",
    topic: "liver",
    title: {
      en: "MASLD and NAFLD: explaining the new name",
      ar: "MASLD وNAFLD: شرح الاسم الجديد لمرض الكبد الدهني",
    },
    source: "Liver UK",
  },
  {
    youtubeId: "-6xX1ra5fnw",
    topic: "liver",
    title: { en: "Liver disease", ar: "أمراض الكبد" },
    source: "NHS",
  },
  {
    youtubeId: "Q9I_833Zymg",
    topic: "vitamin-d",
    title: {
      en: "Why you need vitamin D and how to get it",
      ar: "لماذا تحتاج فيتامين د وكيف تحصل عليه",
    },
    source: "Mayo Clinic",
  },
  {
    youtubeId: "3TppBBhIYyQ",
    topic: "vitamin-d",
    title: { en: "How much vitamin D do you need?", ar: "كم تحتاج من فيتامين د؟" },
    source: "Mayo Clinic",
  },
];

export function getVideosForTopic(
  topic: VideoTopicKey,
  videos: HealthVideo[] = HEALTH_VIDEOS
): HealthVideo[] {
  return videos.filter((video) => video.topic === topic);
}

// Finds the topics a free-text question or lab-marker name is about, in the
// order they appear in VIDEO_TOPICS. Keyword matching only: nothing leaves the
// browser and no personal data is sent anywhere.
export function matchVideoTopics(text: string): VideoTopicKey[] {
  const haystack = ` ${text.toLowerCase()} `;

  return VIDEO_TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => haystack.includes(keyword))
  ).map((topic) => topic.key);
}

export function getVideosForText(
  text: string,
  limit = 3,
  videos: HealthVideo[] = HEALTH_VIDEOS
): HealthVideo[] {
  return matchVideoTopics(text)
    .flatMap((topic) => getVideosForTopic(topic, videos))
    .slice(0, limit);
}

export function buildEmbedUrl(youtubeId: string, isArabic: boolean): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    cc_load_policy: "1",
    hl: isArabic ? "ar" : "en",
    cc_lang_pref: isArabic ? "ar" : "en",
  });

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    youtubeId
  )}?${params.toString()}`;
}
