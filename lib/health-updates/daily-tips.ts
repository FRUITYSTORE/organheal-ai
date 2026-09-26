export type TipCategory =
  | "nutrition"
  | "activity"
  | "sleep"
  | "heart"
  | "mind"
  | "prevention"
  | "labs";

type Localized = { title: string; body: string };

export type DailyTip = {
  id: string;
  category: TipCategory;
  en: Localized;
  ar: Localized;
};

export const TIP_CATEGORY_LABELS: Record<TipCategory, { en: string; ar: string }> = {
  nutrition: { en: "Nutrition", ar: "التغذية" },
  activity: { en: "Activity", ar: "النشاط" },
  sleep: { en: "Sleep", ar: "النوم" },
  heart: { en: "Heart & kidneys", ar: "القلب والكلى" },
  mind: { en: "Mind", ar: "الصحة النفسية" },
  prevention: { en: "Prevention", ar: "الوقاية" },
  labs: { en: "Understand your results", ar: "افهم نتائجك" },
};

// General, widely accepted wellness guidance (in line with WHO/CDC public
// advice). Educational only — never a substitute for a clinician's advice.
// Ordered so neighbouring tips come from different categories.
export const DAILY_TIPS: DailyTip[] = [
  {
    id: "hydration",
    category: "nutrition",
    en: {
      title: "Hydration: a small habit with a big effect",
      body: "Even mild dehydration can cause tiredness and headaches. Drink water regularly through the day — more in hot weather or when you exercise. Pale-yellow urine is a simple sign you are doing well.",
    },
    ar: {
      title: "الترطيب: عادة صغيرة بتأثير كبير",
      body: "حتى الجفاف الخفيف قد يسبب التعب والصداع. اشرب الماء بانتظام خلال اليوم، وأكثر في الطقس الحار أو عند ممارسة الرياضة. لون البول الأصفر الفاتح علامة بسيطة على أنك بخير.",
    },
  },
  {
    id: "brisk-walk",
    category: "activity",
    en: {
      title: "A brisk walk counts",
      body: "Adults benefit from about 150 minutes of moderate activity a week. A brisk 30-minute walk on five days gets you there — and you can split it into shorter walks.",
    },
    ar: {
      title: "المشي السريع يكفي",
      body: "يستفيد البالغون من حوالي 150 دقيقة أسبوعيًا من النشاط المعتدل. مشي سريع لمدة 30 دقيقة في خمسة أيام يحقق ذلك، ويمكنك تقسيمه إلى فترات أقصر.",
    },
  },
  {
    id: "regular-sleep",
    category: "sleep",
    en: {
      title: "Keep a steady sleep schedule",
      body: "Most adults do best with 7 or more hours of sleep. Going to bed and waking up at similar times — even on weekends — helps your body clock and your energy.",
    },
    ar: {
      title: "حافظ على موعد نوم ثابت",
      body: "يحتاج معظم البالغين إلى 7 ساعات نوم أو أكثر. الالتزام بمواعيد متقاربة للنوم والاستيقاظ حتى في عطلة نهاية الأسبوع يساعد ساعتك البيولوجية ونشاطك.",
    },
  },
  {
    id: "blood-pressure",
    category: "heart",
    en: {
      title: "High blood pressure is often silent",
      body: "Many people with high blood pressure feel nothing. Have it checked regularly — controlling it protects your heart, brain and kidneys.",
    },
    ar: {
      title: "ارتفاع الضغط غالبًا بلا أعراض",
      body: "كثيرون يعانون من ارتفاع ضغط الدم دون أن يشعروا بشيء. افحصه بانتظام، فضبطه يحمي قلبك ودماغك وكليتيك.",
    },
  },
  {
    id: "breathing",
    category: "mind",
    en: {
      title: "Five minutes of slow breathing",
      body: "Breathe in for four counts and out for six, for five minutes. Slow, longer exhales can help your body settle when you feel stressed.",
    },
    ar: {
      title: "خمس دقائق من التنفس البطيء",
      body: "استنشق لأربع عدّات وازفر لست عدّات، لمدة خمس دقائق. الزفير الأطول والأبطأ يساعد جسمك على الهدوء عند التوتر.",
    },
  },
  {
    id: "hand-washing",
    category: "prevention",
    en: {
      title: "20 seconds that prevent illness",
      body: "Wash your hands with soap for at least 20 seconds — before eating, after the bathroom and after being in public places. It is one of the simplest ways to avoid infections.",
    },
    ar: {
      title: "20 ثانية تمنع المرض",
      body: "اغسل يديك بالماء والصابون لمدة 20 ثانية على الأقل قبل الأكل وبعد استخدام الحمام وبعد الأماكن العامة. هذه من أبسط طرق تجنب العدوى.",
    },
  },
  {
    id: "bring-results",
    category: "labs",
    en: {
      title: "Bring past results to your visit",
      body: "One lab value tells only part of the story; the trend over time tells more. Bring your earlier reports to appointments so your doctor can compare.",
    },
    ar: {
      title: "خذ نتائجك السابقة إلى موعدك",
      body: "قيمة واحدة في التحليل تحكي جزءًا من القصة، أما التغير عبر الزمن فيحكي أكثر. أحضر تقاريرك السابقة إلى المواعيد ليقارن الطبيب بينها.",
    },
  },
  {
    id: "fruit-veg",
    category: "nutrition",
    en: {
      title: "Aim for five portions a day",
      body: "Around 400 grams — about five portions — of fruit and vegetables a day supports heart health and digestion. Fresh, frozen and canned (without added sugar or salt) all count.",
    },
    ar: {
      title: "خمس حصص من الخضار والفاكهة يوميًا",
      body: "حوالي 400 غرام، أي نحو خمس حصص، من الخضار والفاكهة يوميًا يدعم صحة القلب والهضم. الطازج والمجمّد والمعلّب (دون سكر أو ملح مضاف) كلها تُحتسب.",
    },
  },
  {
    id: "break-sitting",
    category: "activity",
    en: {
      title: "Break up long sitting",
      body: "Stand up and move for a minute or two every 30 to 60 minutes. Short breaks add up and are good for your back, circulation and focus.",
    },
    ar: {
      title: "اقطع الجلوس الطويل",
      body: "قف وتحرك دقيقة أو دقيقتين كل 30 إلى 60 دقيقة. الفواصل القصيرة تتراكم فائدتها لظهرك ودورتك الدموية وتركيزك.",
    },
  },
  {
    id: "salt",
    category: "heart",
    en: {
      title: "Go easy on salt",
      body: "Try to keep salt under about 5 grams a day (roughly one teaspoon), including salt in bread, cheese and processed food. Less salt helps blood pressure.",
    },
    ar: {
      title: "خفف من الملح",
      body: "حاول ألا يتجاوز الملح 5 غرامات يوميًا تقريبًا (ملعقة صغيرة)، بما في ذلك الملح في الخبز والجبن والأطعمة المصنّعة. تقليل الملح يفيد ضغط الدم.",
    },
  },
  {
    id: "screen-breaks",
    category: "prevention",
    en: {
      title: "The 20-20-20 eye break",
      body: "Every 20 minutes of screen time, look at something 20 feet (6 metres) away for 20 seconds. It can ease eye strain and dryness.",
    },
    ar: {
      title: "قاعدة 20-20-20 للعينين",
      body: "كل 20 دقيقة أمام الشاشة انظر إلى شيء يبعد نحو 6 أمتار لمدة 20 ثانية. قد يخفف ذلك إجهاد العين وجفافها.",
    },
  },
  {
    id: "fasting-labs",
    category: "labs",
    en: {
      title: "Before a blood test",
      body: "Ask whether you need to fast — some tests require it and many do not. Plain water is usually fine, and taking your prescribed medicines should be confirmed with the lab or your doctor.",
    },
    ar: {
      title: "قبل تحليل الدم",
      body: "اسأل هل تحتاج إلى الصيام، فبعض التحاليل تتطلبه وكثير منها لا يتطلبه. الماء العادي مسموح غالبًا، وتناول أدويتك الموصوفة يُفضّل تأكيده مع المختبر أو طبيبك.",
    },
  },
  {
    id: "sunscreen",
    category: "prevention",
    en: {
      title: "Protect your skin from the sun",
      body: "Use broad-spectrum sunscreen (SPF 30 or higher), wear a hat, and seek shade around midday when the sun is strongest.",
    },
    ar: {
      title: "احمِ بشرتك من الشمس",
      body: "استخدم واقي شمس واسع الطيف (SPF 30 فأكثر)، وارتدِ قبعة، واستظل وقت الظهيرة حين تكون الشمس أقوى.",
    },
  },
  {
    id: "connection",
    category: "mind",
    en: {
      title: "Connection is good medicine",
      body: "Talking with someone you trust — even for ten minutes — can lift your mood and lower stress. If low mood lasts for weeks, speak with a health professional.",
    },
    ar: {
      title: "التواصل دواء جيد",
      body: "الحديث مع شخص تثق به، ولو لعشر دقائق، قد يحسّن مزاجك ويقلل التوتر. وإذا استمر انخفاض المزاج أسابيع فتحدث مع مختص صحي.",
    },
  },
  {
    id: "sugary-drinks",
    category: "nutrition",
    en: {
      title: "Cut back on sugary drinks",
      body: "Sodas and sweetened juices add a lot of sugar quickly. Swapping some of them for water or unsweetened tea is an easy step for weight and blood sugar.",
    },
    ar: {
      title: "قلّل المشروبات المحلّاة",
      body: "المشروبات الغازية والعصائر المحلّاة تضيف كمية كبيرة من السكر بسرعة. استبدال بعضها بالماء أو الشاي غير المحلّى خطوة سهلة للوزن وسكر الدم.",
    },
  },
  {
    id: "strength",
    category: "activity",
    en: {
      title: "Add strength twice a week",
      body: "Muscle-strengthening activity on two days a week — body-weight exercises, bands or weights — supports bones, balance and metabolism at every age.",
    },
    ar: {
      title: "أضف تمارين القوة مرتين أسبوعيًا",
      body: "تمارين تقوية العضلات في يومين أسبوعيًا (بوزن الجسم أو الأربطة أو الأثقال) تدعم العظام والتوازن والأيض في كل الأعمار.",
    },
  },
  {
    id: "kidney-protect",
    category: "heart",
    en: {
      title: "Protecting your kidneys",
      body: "Diabetes and high blood pressure are leading causes of kidney disease, so keeping them controlled protects your kidneys. Avoid regular painkillers like ibuprofen unless your doctor agrees.",
    },
    ar: {
      title: "حماية كليتيك",
      body: "السكري وارتفاع الضغط من أبرز أسباب أمراض الكلى، لذا فضبطهما يحمي كليتيك. تجنب المسكنات مثل الإيبوبروفين بشكل متكرر إلا بموافقة طبيبك.",
    },
  },
  {
    id: "wind-down",
    category: "sleep",
    en: {
      title: "Wind down before bed",
      body: "Dim the lights and put screens away for 30 to 60 minutes before sleep. A cool, dark, quiet room and limiting caffeine late in the day make falling asleep easier.",
    },
    ar: {
      title: "هدّئ يومك قبل النوم",
      body: "خفّف الإضاءة وابتعد عن الشاشات قبل النوم بنصف ساعة إلى ساعة. غرفة باردة ومظلمة وهادئة وتقليل الكافيين في آخر اليوم يسهّلان النوم.",
    },
  },
  {
    id: "vaccines",
    category: "prevention",
    en: {
      title: "Keep vaccinations up to date",
      body: "Vaccines protect you and the people around you. Ask your doctor or local clinic which vaccines are recommended for your age and health conditions.",
    },
    ar: {
      title: "حافظ على تطعيماتك محدّثة",
      body: "اللقاحات تحميك وتحمي من حولك. اسأل طبيبك أو عيادتك عن اللقاحات الموصى بها لعمرك وحالتك الصحية.",
    },
  },
  {
    id: "healthy-fats",
    category: "heart",
    en: {
      title: "Choose healthier fats",
      body: "Replace some saturated fat (butter, fatty meat) with unsaturated fat such as olive oil, nuts and fish. This kind of swap supports healthy cholesterol.",
    },
    ar: {
      title: "اختر الدهون الأفضل",
      body: "استبدل جزءًا من الدهون المشبعة (الزبدة واللحوم الدسمة) بدهون غير مشبعة مثل زيت الزيتون والمكسرات والأسماك. هذا التبديل يدعم مستوى صحيًا للكوليسترول.",
    },
  },
  {
    id: "ask-questions",
    category: "labs",
    en: {
      title: "Prepare three questions",
      body: "Before a doctor visit, write down your top three questions — what a result means, what to do next, and when to re-test. You will leave with clearer answers.",
    },
    ar: {
      title: "جهّز ثلاثة أسئلة",
      body: "قبل زيارة الطبيب اكتب أهم ثلاثة أسئلة: ماذا تعني النتيجة، وماذا أفعل بعد ذلك، ومتى أعيد الفحص. ستخرج بإجابات أوضح.",
    },
  },
  {
    id: "heat-safety",
    category: "prevention",
    en: {
      title: "Stay safe in the heat",
      body: "In hot weather, drink water before you feel thirsty, avoid hard exercise at midday and check on older relatives. Dizziness, confusion or very hot dry skin needs urgent medical help.",
    },
    ar: {
      title: "الأمان في الحر",
      body: "في الطقس الحار اشرب الماء قبل أن تشعر بالعطش، وتجنب التمارين الشاقة وقت الظهيرة، وتفقّد كبار السن من أقاربك. الدوخة أو التشوش أو الجلد الحار الجاف تستدعي مساعدة طبية عاجلة.",
    },
  },
  {
    id: "whole-grains",
    category: "nutrition",
    en: {
      title: "Pick whole grains and pulses",
      body: "Whole grains, lentils and beans give steady energy and fibre that helps digestion and cholesterol. Try swapping white bread or rice for a whole-grain version a few times a week.",
    },
    ar: {
      title: "اختر الحبوب الكاملة والبقوليات",
      body: "الحبوب الكاملة والعدس والفاصولياء تمنح طاقة ثابتة وأليافًا تفيد الهضم والكوليسترول. جرّب استبدال الخبز أو الأرز الأبيض بنسخة كاملة عدة مرات أسبوعيًا.",
    },
  },
  {
    id: "warning-signs",
    category: "heart",
    en: {
      title: "Know the emergency signs",
      body: "Chest pain or pressure, trouble breathing, sudden weakness on one side, or trouble speaking need emergency care right away — do not wait for an appointment.",
    },
    ar: {
      title: "اعرف علامات الطوارئ",
      body: "ألم أو ضغط في الصدر، أو صعوبة في التنفس، أو ضعف مفاجئ في جانب واحد، أو صعوبة في الكلام: كلها تستدعي رعاية طارئة فورًا، ولا تنتظر موعدًا.",
    },
  },
  {
    id: "stop-smoking",
    category: "prevention",
    en: {
      title: "It is never too late to quit smoking",
      body: "Stopping smoking benefits your heart and lungs at any age, and benefits begin within days. Support from a clinic or helpline roughly doubles the chances of quitting.",
    },
    ar: {
      title: "لم يفت الأوان للإقلاع عن التدخين",
      body: "التوقف عن التدخين يفيد قلبك ورئتيك في أي عمر، وتبدأ الفوائد خلال أيام. الدعم من عيادة أو خط مساعدة يضاعف تقريبًا فرص النجاح.",
    },
  },
  {
    id: "medicines",
    category: "labs",
    en: {
      title: "Do not stop prescribed medicines alone",
      body: "If you feel better, have side effects or have doubts about a medicine, talk to your doctor or pharmacist before changing or stopping it.",
    },
    ar: {
      title: "لا توقف دواءك الموصوف بمفردك",
      body: "إذا شعرت بتحسن أو ظهرت أعراض جانبية أو راودتك شكوك حول دواء، فتحدث مع طبيبك أو الصيدلاني قبل تغييره أو إيقافه.",
    },
  },
  {
    id: "mindful-eating",
    category: "mind",
    en: {
      title: "Eat without distractions",
      body: "Eating slowly, at the table and away from screens helps you notice fullness earlier. It is a gentle way to support a healthy weight.",
    },
    ar: {
      title: "تناول طعامك دون مشتتات",
      body: "الأكل ببطء وعلى المائدة وبعيدًا عن الشاشات يساعدك على ملاحظة الشبع مبكرًا. إنها طريقة لطيفة لدعم وزن صحي.",
    },
  },
];

function dayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

// Same day -> same tips for every visitor; a new set each day, cycling
// through the whole library before repeating.
export function getDailyTips(date: Date, count = 3): DailyTip[] {
  const total = DAILY_TIPS.length;
  const start = (dayNumber(date) * count) % total;

  return Array.from({ length: Math.min(count, total) }, (_, offset) => {
    return DAILY_TIPS[(start + offset) % total];
  });
}
