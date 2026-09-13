import type {
  HealthEvidenceData,
} from "@/lib/health-intelligence/engines/health-evidence.engine";

type HealthEvidenceCardProps = {
  evidence: HealthEvidenceData;
  confidence: number;
  isArabic?: boolean;
};

type EvidencePresentationItem = {
  id: string;
  source: string;
  title: string;
  detail: string;
  value: string | number | null;
  organ: string | null;
  importance?: string;
};

type EvidenceRuntimeView = {
  primaryEvidence?: EvidencePresentationItem[];
  supportingEvidence?: EvidencePresentationItem[];
  evidence?: EvidencePresentationItem[];
  healthScore?: number;
  overallScore?: number;
  score?: number;
};

function getArabicSourceLabel(source: string) {
  switch (source.trim().toLowerCase()) {
    case "assessment":
      return "التقييم";

    case "checkin":
    case "check-in":
      return "التحديث اليومي";

    case "report":
      return "التقرير";

    case "analysis":
      return "التحليل";

    case "history":
      return "السجل الصحي";

    case "pattern":
      return "النمط الصحي";

    case "trend":
      return "الاتجاه الصحي";

    case "finding":
      return "النتيجة الصحية";

    case "timeline":
      return "المسار الصحي";

    default:
      return "دليل صحي";
  }
}

function getArabicOrganLabel(
  organ: string | null | undefined
): string | null {
  if (!organ) {
    return null;
  }

  switch (organ.trim().toLowerCase()) {
    case "brain":
      return "الدماغ";

    case "heart":
    case "cardiovascular":
      return "القلب والأوعية الدموية";

    case "kidney":
    case "kidneys":
    case "renal":
      return "الكلى";

    case "liver":
      return "الكبد";

    case "lung":
    case "lungs":
    case "respiratory":
      return "الجهاز التنفسي";

    case "metabolic":
    case "metabolism":
      return "الأيض";

    default:
      return null;
  }
}

function getArabicEvidenceTitle(
  item: EvidencePresentationItem
): string {
  const organ =
    getArabicOrganLabel(item.organ);

  if (item.id === "overall-trend") {
    return "اتجاه الصحة العام";
  }

  if (item.id === "priority-area") {
    return organ
      ? `الأولوية الصحية الحالية: ${organ}`
      : "مجال الأولوية الصحية الحالي";
  }

  switch (item.source.trim().toLowerCase()) {
    case "trend":
      return organ
        ? `اتجاه صحة ${organ}`
        : "اتجاه صحي مسجل";

    case "finding":
      return organ
        ? `مؤشر صحي في ${organ}`
        : "مؤشر صحي يحتاج إلى المتابعة";

    case "pattern":
      return organ
        ? `نمط صحي مرتبط بـ ${organ}`
        : "نمط صحي ملحوظ";

    case "timeline":
      return "حدث صحي مسجل";

    case "assessment":
      return organ
        ? `نتيجة تقييم ${organ}`
        : "نتيجة تقييم صحي";

    case "checkin":
    case "check-in":
      return "نتيجة التحديث الصحي";

    case "report":
      return "دليل من التقرير الطبي";

    case "analysis":
      return "دليل من التحليل الصحي";

    case "history":
      return "دليل من السجل الصحي";

    default:
      return "دليل صحي داعم";
  }
}

function getArabicEvidenceDetail(
  item: EvidencePresentationItem
): string {
  const organ =
    getArabicOrganLabel(item.organ);

  if (item.id === "overall-trend") {
    return "يلخص هذا الدليل الاتجاه العام للبيانات الصحية المسجلة عبر الزمن.";
  }

  if (item.id === "priority-area") {
    return organ
      ? `تشير البيانات المتاحة إلى أن ${organ} يحتاج إلى اهتمام أكبر ضمن المتابعة الحالية.`
      : "تشير البيانات المتاحة إلى وجود مجال صحي يحتاج إلى أولوية أكبر في المتابعة.";
  }

  switch (item.source.trim().toLowerCase()) {
    case "trend":
      return organ
        ? `يعرض هذا الدليل التغير المسجل في ${organ} عبر البيانات المتاحة.`
        : "يعرض هذا الدليل تغيرًا صحيًا مسجلًا عبر الزمن.";

    case "finding":
      return "يوجد مؤشر صحي مهم ضمن البيانات المتاحة ويستحق المراجعة ضمن خطة المتابعة.";

    case "pattern":
      return "تم رصد نمط صحي متكرر في البيانات المتاحة ويستحق المتابعة.";

    case "timeline":
      return "تم تسجيل هذا الحدث ضمن التسلسل الزمني لبياناتك الصحية.";

    case "assessment":
      return "تعكس هذه المعلومة نتيجة من أحد التقييمات الصحية المسجلة.";

    case "checkin":
    case "check-in":
      return "تعكس هذه المعلومة أحدث سياق صحي تم تسجيله في المتابعة اليومية.";

    case "report":
      return "هذه المعلومة مستندة إلى تقرير طبي موجود ضمن بياناتك الصحية.";

    case "analysis":
      return "هذه المعلومة مستندة إلى تحليل صحي منظم ضمن بياناتك المتاحة.";

    case "history":
      return "هذه المعلومة مستندة إلى بيانات محفوظة في سجلك الصحي.";

    default:
      return "يعرض هذا الدليل معلومة داعمة ضمن الصورة الصحية الحالية.";
  }
}

function getArabicEvidenceValue(
  value: string | number | null
): string | number | null {
  if (
    value === null ||
    typeof value === "number"
  ) {
    return value;
  }

  switch (value.trim().toLowerCase()) {
    case "critical":
      return "حرج";

    case "warning":
      return "تنبيه";

    case "information":
      return "معلومة";

    case "success":
      return "إيجابي";

    case "high":
      return "مرتفع";

    case "moderate":
    case "medium":
      return "متوسط";

    case "low":
      return "منخفض";

    case "stable":
      return "مستقر";

    case "improving":
      return "يتحسن";

    case "worsening":
    case "declining":
      return "يتراجع";

    default:
      return "—";
  }
}

function getEvidenceItems(
  evidence: HealthEvidenceData
): EvidencePresentationItem[] {
  const view =
    evidence as unknown as EvidenceRuntimeView;

  const combined = [
    ...(view.primaryEvidence ?? []),
    ...(view.supportingEvidence ?? []),
    ...(view.evidence ?? []),
  ];

  const unique =
    new Map<
      string,
      EvidencePresentationItem
    >();

  for (const item of combined) {
    if (
      item &&
      typeof item.id === "string"
    ) {
      unique.set(
        item.id,
        item
      );
    }
  }

  return [
    ...unique.values(),
  ].slice(0, 5);
}

function getHealthScore(
  evidence: HealthEvidenceData
): number | null {
  const view =
    evidence as unknown as EvidenceRuntimeView;

  const possibleScores = [
    view.healthScore,
    view.overallScore,
    view.score,
  ];

  for (const value of possibleScores) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return null;
}

export default function HealthEvidenceCard({
  evidence,
  confidence,
  isArabic = false,
}: HealthEvidenceCardProps) {
  const evidenceItems =
    getEvidenceItems(evidence);

  const healthScore =
    getHealthScore(evidence);

  return (
    <section
      className="healthEvidenceCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="healthEvidenceHeader">
        <div>
          <span className="healthEvidenceKicker">
            {isArabic
              ? "شفافية الذكاء الصحي"
              : "Intelligence Transparency"}
          </span>

          <h2>
            {isArabic
              ? "لماذا توصل OrganHeal إلى هذه النتيجة؟"
              : evidence.headline}
          </h2>

          <p>
            {isArabic
              ? "يعرض هذا القسم الأدلة الصحية المنظمة التي استخدمها OrganHeal لبناء الصورة الحالية من بياناتك المتاحة."
              : evidence.explanation}
          </p>
        </div>

        <div className="healthEvidenceConfidence">
          <span>
            {isArabic
              ? "الثقة"
              : "Confidence"}
          </span>

          <strong>
            {confidence}%
          </strong>
        </div>
      </div>

      <div className="healthEvidenceMetrics">
        <article>
          <span>
            {isArabic
              ? "المصادر المترابطة"
              : "Connected sources"}
          </span>

          <strong>
            {evidence.sourceCount}
          </strong>
        </article>

        <article>
          <span>
            {isArabic
              ? "نقاط البيانات"
              : "Data points reviewed"}
          </span>

          <strong>
            {evidence.dataPointsReviewed}
          </strong>
        </article>

        <article>
          <span>
            {healthScore !== null
              ? isArabic
                ? "النتيجة الصحية"
                : "Health score"
              : isArabic
                ? "عناصر الأدلة"
                : "Evidence items"}
          </span>

          <strong>
            {healthScore !== null
              ? `${healthScore}/100`
              : evidenceItems.length}
          </strong>
        </article>
      </div>

      {evidenceItems.length > 0 && (
        <div className="healthEvidenceList">
          <strong className="healthEvidenceListHeader">
            {isArabic
              ? "أهم الأدلة"
              : "Key evidence"}
          </strong>

          {evidenceItems.map((item) => (
            <article
              className="healthEvidenceItem"
              key={item.id}
            >
              <div>
                <span className="healthEvidenceSource">
                  {isArabic
                    ? getArabicSourceLabel(
                        item.source
                      )
                    : item.source}
                </span>

                <strong>
                  {isArabic
                    ? getArabicEvidenceTitle(
                        item
                      )
                    : item.title}
                </strong>

                <p>
                  {isArabic
                    ? getArabicEvidenceDetail(
                        item
                      )
                    : item.detail}
                </p>
              </div>

              {item.value !== null &&
                item.value !== undefined && (
                  <span className="healthEvidenceValue">
                    {isArabic
                      ? getArabicEvidenceValue(
                          item.value
                        )
                      : item.value}
                  </span>
                )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}