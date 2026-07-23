type UnifiedHealthCardProps = {
  unifiedHealth: unknown;
};

type UnifiedHealthSignal = {
  id?: string | number;
  title?: string;
  name?: string;
  category?: string;
  organ?: string;
  system?: string;
  status?: string;
  riskLevel?: string;
  priority?: string;
  insight?: string;
  summary?: string;
  description?: string;
  interpretation?: string;
  recommendation?: string;
  action?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function normalizeUnifiedHealthSignals(
  unifiedHealth: unknown
): UnifiedHealthSignal[] {
  if (Array.isArray(unifiedHealth)) {
    return unifiedHealth.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      name: getText(item.name),
      category: getText(item.category),
      organ: getText(item.organ),
      system: getText(item.system),
      status: getText(item.status),
      riskLevel: getText(item.riskLevel),
      priority: getText(item.priority),
      insight: getText(item.insight),
      summary: getText(item.summary),
      description: getText(item.description),
      interpretation: getText(item.interpretation),
      recommendation: getText(item.recommendation),
      action: getText(item.action),
    }));
  }

  if (!isRecord(unifiedHealth)) return [];

  const possibleItems =
    unifiedHealth.signals ||
    unifiedHealth.items ||
    unifiedHealth.insights ||
    unifiedHealth.healthSignals ||
    unifiedHealth.unifiedSignals ||
    unifiedHealth.priorities ||
    unifiedHealth.patterns ||
    unifiedHealth.recommendations ||
    unifiedHealth.actionItems;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    name: getText(item.name),
    category: getText(item.category),
    organ: getText(item.organ),
    system: getText(item.system),
    status: getText(item.status),
    riskLevel: getText(item.riskLevel),
    priority: getText(item.priority),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    interpretation: getText(item.interpretation),
    recommendation: getText(item.recommendation),
    action: getText(item.action),
  }));
}

function normalizeSeverity(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "moderate" || normalized === "medium") {
    return "Moderate";
  }
  if (normalized === "low") return "Low";

  return value.trim();
}

function getSeverityClasses(value: string): string {
  const severity = normalizeSeverity(value);

  if (severity === "High") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "Moderate") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function UnifiedHealthCard({
  unifiedHealth,
}: UnifiedHealthCardProps) {
  const signals = normalizeUnifiedHealthSignals(unifiedHealth).slice(0, 3);

  if (signals.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-600">
          Your Health Priorities
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          Focus on what matters most
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          Based on your uploaded report and available health information,
          these are the areas that deserve the clearest attention and
          follow-up.
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        {signals.map((item, index) => {
          const title =
            item.title ||
            item.name ||
            item.organ ||
            item.system ||
            item.category ||
            `Health Priority ${index + 1}`;

          const explanation =
            item.insight ||
            item.interpretation ||
            item.summary ||
            item.description;

          const recommendedFocus = item.recommendation || item.action;

          const severity =
            normalizeSeverity(item.riskLevel || item.status || "") ||
            "Priority";

          return (
            <article
              key={item.id ?? `${title}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 md:flex-row md:items-start md:justify-between md:p-6">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Priority {index + 1}
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {title}
                    </h3>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${getSeverityClasses(
                    severity
                  )}`}
                >
                  {severity === "Priority"
                    ? "Priority area"
                    : `${severity} priority`}
                </span>
              </div>

              <div className="grid gap-5 p-5 md:p-6">
                {explanation && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Why this matters
                    </p>

                    <p className="mt-2 text-sm leading-7 text-slate-700 md:text-base">
                      {explanation}
                    </p>
                  </div>
                )}

                {recommendedFocus && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                      Recommended focus
                    </p>

                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {recommendedFocus}
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-6 text-slate-500">
        These priorities are educational interpretations of the available
        information and should be reviewed alongside the original report and
        professional medical advice.
      </p>
    </section>
  );
}
