export type BlogAudience = "patient" | "family" | "general";
export type BlogDifficulty = "beginner" | "intermediate";

export type BlogPost = {
  slug: string;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  category: string;
  categoryAr: string;
  date: string;
  readTime: string;
  readTimeAr: string;
  organSystem: string;
  organSystemAr: string;
  labMarkers: string[];
  audience: BlogAudience[];
  difficulty: BlogDifficulty;
  content: string;
  contentAr: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "understanding-cholesterol-levels",
    title: "Understanding Cholesterol Levels",
    titleAr: "فهم مستويات الكوليسترول",
    excerpt:
      "Learn what cholesterol numbers mean and how they may relate to cardiovascular health.",
    excerptAr:
      "تعرّف على معنى أرقام الكوليسترول وكيف قد ترتبط بصحة القلب والأوعية الدموية.",
    category: "Heart Health",
    categoryAr: "صحة القلب",
    date: "2026-06-10",
    readTime: "4 min read",
    readTimeAr: "قراءة 4 دقائق",
    organSystem: "Heart and metabolic health",
    organSystemAr: "القلب والصحة الأيضية",
    labMarkers: ["LDL", "HDL", "Triglycerides", "Total Cholesterol"],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Cholesterol is a wax-like substance found in the blood. The body needs some cholesterol to build cells and make certain hormones, but high levels of some cholesterol types may increase health risk over time.

LDL cholesterol is often called “bad cholesterol” because higher levels may contribute to plaque buildup inside arteries. This can affect blood flow and may increase cardiovascular risk.

HDL cholesterol is often called “good cholesterol” because it helps carry excess cholesterol away from the bloodstream.

Triglycerides are another type of fat in the blood. They may rise with excess calories, low activity, diabetes risk, or some lifestyle patterns.

A cholesterol result should not be judged from one number alone. It is best understood with other factors such as age, blood pressure, diabetes risk, smoking, family history, weight, medications, and the clinician’s assessment.

Useful questions to ask your clinician may include: Which number is most important in my result? Do I need lifestyle changes, medication, or repeat testing? How often should I monitor my cholesterol?
`,
    contentAr: `
الكوليسترول مادة شبيهة بالشمع توجد في الدم. يحتاج الجسم إلى كمية معينة منه لبناء الخلايا وإنتاج بعض الهرمونات، لكن ارتفاع بعض أنواعه قد يزيد المخاطر الصحية مع الوقت.

يُسمّى LDL أحيانًا “الكوليسترول الضار” لأن ارتفاعه قد يساهم في تراكم الترسبات داخل الشرايين، وهذا قد يؤثر على تدفق الدم ويزيد مخاطر أمراض القلب والأوعية الدموية.

أما HDL فيُعرف غالبًا باسم “الكوليسترول الجيد” لأنه يساعد على نقل الكوليسترول الزائد بعيدًا عن مجرى الدم.

الدهون الثلاثية هي نوع آخر من الدهون في الدم، وقد ترتفع مع زيادة السعرات، قلة النشاط، اضطراب السكر، أو بعض أنماط الحياة.

لا يجب الحكم على نتيجة الكوليسترول من رقم واحد فقط. الأفضل فهمها مع عوامل أخرى مثل العمر، ضغط الدم، خطر السكري، التدخين، التاريخ العائلي، الوزن، الأدوية، وتقييم الطبيب.

من الأسئلة المفيدة للطبيب: ما الرقم الأهم في نتيجتي؟ هل أحتاج تغيير نمط الحياة أو علاجًا أو إعادة الفحص؟ وكم مرة يجب متابعة الكوليسترول؟
`,
  },
  {
    slug: "how-blood-pressure-affects-heart-health",
    title: "How Blood Pressure Affects Heart Health",
    titleAr: "كيف يؤثر ضغط الدم على صحة القلب",
    excerpt:
      "Understand the relationship between blood pressure and cardiovascular risk.",
    excerptAr:
      "افهم العلاقة بين ضغط الدم ومخاطر أمراض القلب والأوعية الدموية.",
    category: "Heart Health",
    categoryAr: "صحة القلب",
    date: "2026-06-10",
    readTime: "3 min read",
    readTimeAr: "قراءة 3 دقائق",
    organSystem: "Heart and blood vessels",
    organSystemAr: "القلب والأوعية الدموية",
    labMarkers: [],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Blood pressure reflects the force of blood pushing against artery walls. It is usually written as two numbers: systolic pressure and diastolic pressure.

Persistently elevated blood pressure can increase the workload on the heart and blood vessels. Over time, this may contribute to heart, kidney, brain, and vascular complications.

Blood pressure can change during the day because of activity, stress, sleep, caffeine, pain, medications, and measurement technique.

One reading does not always mean a diagnosis. Repeated readings, correct measurement technique, and clinical review are important.

Helpful questions for a clinician include: Are my readings consistently high? Should I monitor at home? What target range is appropriate for me? What lifestyle or medication steps should I consider?
`,
    contentAr: `
يعكس ضغط الدم قوة اندفاع الدم على جدران الشرايين. ويُكتب غالبًا برقمين: الضغط الانقباضي والضغط الانبساطي.

ارتفاع ضغط الدم بشكل مستمر قد يزيد العبء على القلب والأوعية الدموية. ومع الوقت قد يساهم في مضاعفات تتعلق بالقلب، الكلى، الدماغ، والأوعية.

قد يتغير ضغط الدم خلال اليوم بسبب النشاط، التوتر، النوم، الكافيين، الألم، الأدوية، وطريقة القياس.

قراءة واحدة لا تعني دائمًا وجود تشخيص. المهم هو تكرار القياسات، استخدام طريقة قياس صحيحة، ومراجعة الطبيب.

من الأسئلة المفيدة للطبيب: هل قراءاتي مرتفعة باستمرار؟ هل أحتاج قياس الضغط في المنزل؟ ما الهدف المناسب لي؟ وما الخطوات المتعلقة بنمط الحياة أو العلاج؟
`,
  },
  {
    slug: "early-signs-of-kidney-disease",
    title: "Early Signs of Kidney Disease",
    titleAr: "العلامات المبكرة لمشاكل الكلى",
    excerpt:
      "Common indicators that may suggest a need to review kidney function with a clinician.",
    excerptAr:
      "مؤشرات شائعة قد تشير إلى الحاجة لمراجعة وظائف الكلى مع الطبيب.",
    category: "Kidney Health",
    categoryAr: "صحة الكلى",
    date: "2026-06-10",
    readTime: "4 min read",
    readTimeAr: "قراءة 4 دقائق",
    organSystem: "Kidney health",
    organSystemAr: "صحة الكلى",
    labMarkers: ["Creatinine", "eGFR", "Urine Albumin", "Urea"],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Kidneys help filter waste, balance fluids, regulate electrolytes, and support blood pressure control.

Early kidney problems may not cause obvious symptoms. Some people only discover changes through blood or urine tests.

Common kidney-related markers include creatinine, eGFR, urine albumin, urea, and electrolytes. These values should be interpreted with age, hydration, medications, blood pressure, diabetes risk, and clinical history.

Possible warning signs can include swelling, changes in urination, persistent fatigue, uncontrolled blood pressure, or abnormal lab results. These signs are not specific and require medical evaluation.

If kidney markers are abnormal, useful questions include: Is this change temporary or persistent? Do I need repeat testing? Could medications, hydration, or blood pressure be affecting the result?
`,
    contentAr: `
تساعد الكلى على تنقية الفضلات، توازن السوائل، تنظيم الأملاح، ودعم التحكم بضغط الدم.

قد لا تسبب مشاكل الكلى المبكرة أعراضًا واضحة، وقد يكتشف بعض الأشخاص التغيرات فقط من خلال فحوصات الدم أو البول.

من المؤشرات المتعلقة بالكلى: الكرياتينين، eGFR، الألبومين في البول، اليوريا، والأملاح. ويجب تفسير هذه القيم مع العمر، الترطيب، الأدوية، ضغط الدم، خطر السكري، والتاريخ الصحي.

قد تشمل العلامات المحتملة: تورم، تغير في التبول، تعب مستمر، ضغط غير مسيطر عليه، أو نتائج مختبر غير طبيعية. هذه العلامات ليست خاصة بالكلى وحدها وتحتاج تقييمًا طبيًا.

إذا ظهرت نتائج غير طبيعية، يمكن سؤال الطبيب: هل التغير مؤقت أم مستمر؟ هل أحتاج إعادة الفحص؟ هل يمكن أن تؤثر الأدوية أو قلة السوائل أو ضغط الدم على النتيجة؟
`,
  },
  {
    slug: "understanding-liver-function-tests",
    title: "Understanding Liver Function Tests",
    titleAr: "فهم فحوصات وظائف الكبد",
    excerpt:
      "A simple guide to common liver laboratory markers and how to discuss them.",
    excerptAr:
      "دليل مبسط لفهم أشهر مؤشرات الكبد المخبرية وكيفية مناقشتها.",
    category: "Liver Health",
    categoryAr: "صحة الكبد",
    date: "2026-06-10",
    readTime: "4 min read",
    readTimeAr: "قراءة 4 دقائق",
    organSystem: "Liver health",
    organSystemAr: "صحة الكبد",
    labMarkers: ["ALT", "AST", "ALP", "Bilirubin", "GGT"],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Liver function tests are blood tests that help clinicians understand liver-related signals.

Common markers include ALT, AST, ALP, GGT, bilirubin, albumin, and sometimes clotting-related tests. Each marker can reflect a different part of liver or bile duct function.

Mild changes may occur for many reasons, including fatty liver, medications, alcohol exposure, viral infections, muscle injury, bile duct issues, or other conditions.

A result should be interpreted in context. A normal AST alone does not fully describe liver health, and an abnormal value does not always mean serious disease.

Useful questions include: Which liver marker is abnormal? Is the pattern liver-cell related or bile-duct related? Should I repeat the test? Do I need imaging or additional blood tests?
`,
    contentAr: `
فحوصات وظائف الكبد هي فحوصات دم تساعد الأطباء على فهم المؤشرات المرتبطة بالكبد.

تشمل المؤشرات الشائعة ALT وAST وALP وGGT والبيليروبين والألبومين، وأحيانًا فحوصات مرتبطة بالتخثر. كل مؤشر قد يعكس جانبًا مختلفًا من وظيفة الكبد أو القنوات الصفراوية.

قد تحدث تغيرات بسيطة لأسباب كثيرة، منها دهون الكبد، بعض الأدوية، الكحول، الالتهابات الفيروسية، إصابة العضلات، مشاكل القنوات الصفراوية، أو حالات أخرى.

يجب تفسير النتيجة حسب السياق. وجود AST طبيعي وحده لا يصف صحة الكبد بالكامل، كما أن وجود قيمة غير طبيعية لا يعني دائمًا مرضًا خطيرًا.

من الأسئلة المفيدة للطبيب: أي مؤشر كبد غير طبيعي؟ هل النمط مرتبط بخلايا الكبد أم بالقنوات الصفراوية؟ هل أحتاج إعادة الفحص؟ هل أحتاج أشعة أو فحوصات دم إضافية؟
`,
  },
  {
    slug: "how-sleep-impacts-brain-health",
    title: "How Sleep Impacts Brain Health",
    titleAr: "كيف يؤثر النوم على صحة الدماغ",
    excerpt:
      "Discover why sleep is important for cognitive performance and overall wellbeing.",
    excerptAr:
      "اكتشف لماذا يُعد النوم مهمًا للأداء الذهني والعافية العامة.",
    category: "Brain Health",
    categoryAr: "صحة الدماغ",
    date: "2026-06-10",
    readTime: "3 min read",
    readTimeAr: "قراءة 3 دقائق",
    organSystem: "Brain and nervous system",
    organSystemAr: "الدماغ والجهاز العصبي",
    labMarkers: [],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Sleep plays an important role in memory, learning, attention, mood, and overall brain function.

Poor sleep quality may affect concentration, emotional balance, decision-making, and daily energy.

Sleep can be affected by stress, screen time, caffeine, pain, shift work, medications, sleep apnea, and irregular schedules.

Healthy sleep habits include keeping a consistent sleep schedule, reducing late caffeine, limiting screens before bed, and creating a calm sleep environment.

If sleep problems are persistent, severe, or associated with snoring, breathing pauses, daytime sleepiness, or mood changes, it is important to discuss them with a clinician.
`,
    contentAr: `
يلعب النوم دورًا مهمًا في الذاكرة، التعلم، الانتباه، المزاج، ووظائف الدماغ بشكل عام.

قد تؤثر جودة النوم الضعيفة على التركيز، التوازن النفسي، اتخاذ القرار، والطاقة اليومية.

يمكن أن يتأثر النوم بالتوتر، استخدام الشاشات، الكافيين، الألم، العمل بنظام المناوبات، بعض الأدوية، انقطاع النفس أثناء النوم، واضطراب مواعيد النوم.

تشمل العادات المفيدة للنوم: الحفاظ على موعد نوم منتظم، تقليل الكافيين في وقت متأخر، تقليل الشاشات قبل النوم، وتهيئة بيئة نوم هادئة.

إذا كانت مشاكل النوم مستمرة أو شديدة أو مرتبطة بالشخير، توقف التنفس، النعاس النهاري، أو تغيرات المزاج، فمن المهم مناقشتها مع الطبيب.
`,
  },
  {
    slug: "understanding-blood-sugar-and-metabolic-health",
    title: "Understanding Blood Sugar and Metabolic Health",
    titleAr: "فهم سكر الدم والصحة الأيضية",
    excerpt:
      "Learn how blood sugar regulation may affect long-term health and daily energy.",
    excerptAr:
      "تعرّف على كيف قد يؤثر تنظيم سكر الدم على الصحة طويلة المدى والطاقة اليومية.",
    category: "Metabolic Health",
    categoryAr: "الصحة الأيضية",
    date: "2026-06-10",
    readTime: "4 min read",
    readTimeAr: "قراءة 4 دقائق",
    organSystem: "Metabolic health",
    organSystemAr: "الصحة الأيضية",
    labMarkers: ["Fasting Glucose", "HbA1c", "Insulin", "Triglycerides"],
    audience: ["patient", "family", "general"],
    difficulty: "beginner",
    content: `
Blood sugar regulation is a central part of metabolic health. The body uses glucose as an important energy source, but consistently high levels may require medical attention.

Common markers include fasting glucose and HbA1c. Fasting glucose reflects a point-in-time measurement, while HbA1c gives an estimate of average blood sugar over the previous few months.

Nutrition, physical activity, sleep, stress, weight, medications, and family history can all influence blood sugar patterns.

A single value should not be interpreted alone. Trends over time and clinical context matter.

Useful questions include: Is my result normal, borderline, or high? Do I need repeat testing? What lifestyle changes are most important for me? Should I check HbA1c or other metabolic markers?
`,
    contentAr: `
تنظيم سكر الدم جزء أساسي من الصحة الأيضية. يستخدم الجسم الجلوكوز كمصدر مهم للطاقة، لكن الارتفاع المستمر قد يحتاج مراجعة طبية.

من المؤشرات الشائعة: سكر الدم الصائم وHbA1c. سكر الدم الصائم يعكس قياسًا في لحظة معينة، بينما يعطي HbA1c تقديرًا لمتوسط السكر خلال الأشهر السابقة.

يمكن أن تؤثر التغذية، النشاط البدني، النوم، التوتر، الوزن، الأدوية، والتاريخ العائلي على نمط سكر الدم.

لا يجب تفسير قيمة واحدة بمعزل عن السياق. الاتجاهات مع الوقت والتقييم السريري مهمان.

من الأسئلة المفيدة: هل نتيجتي طبيعية أم حدية أم مرتفعة؟ هل أحتاج إعادة الفحص؟ ما أهم تغييرات نمط الحياة بالنسبة لي؟ وهل أحتاج HbA1c أو مؤشرات أيضية أخرى؟
`,
  },
];
