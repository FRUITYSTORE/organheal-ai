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
  confidence?: string;
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
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);

      if (isRecord(item)) {
        return (
          getText(item.title) ||
          getText(item.name) ||
          getText(item.label) ||
          getText(item.summary) ||
          getText(item.description)
        );
      }

      return "";
    })
    .filter((item) => item.trim().length > 0);
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
      confidence: getText(item.confidence),
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
    unifiedHealth.items ||
    unifiedHealth.signals ||
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
    confidence: getText(item.confidence),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    interpretation: getText(item.interpretation),
    recommendation: getText(item.recommendation),
    action: getText(item.action),
  }));
}

function getUnifiedHealthSummary(unifiedHealth: unknown): string {
  if (typeof unifiedHealth === "string") return unifiedHealth;

  if (!isRecord(unifiedHealth)) return "";

  return (
    getText(unifiedHealth.summary) ||
    getText(unifiedHealth.overview) ||
    getText(unifiedHealth.narrative) ||
    getText(unifiedHealth.description) ||
    getText(unifiedHealth.healthSummary)
  );
}

function getUnifiedHealthStatus(unifiedHealth: unknown): string {
  if (!isRecord(unifiedHealth)) return "";

  return (
    getText(unifiedHealth.status) ||
    getText(unifiedHealth.overallStatus) ||
    getText(unifiedHealth.healthStatus) ||
    getText(unifiedHealth.currentState)
  );
}

function getUnifiedHealthScore(unifiedHealth: unknown): string {
  if (!isRecord(unifiedHealth)) return "";

  return (
    getText(unifiedHealth.score) ||
    getText(unifiedHealth.overallScore) ||
    getText(unifiedHealth.healthScore) ||
    getText(unifiedHealth.intelligenceScore)
  );
}

function getUnifiedHealthConfidence(unifiedHealth: unknown): string {
  if (!isRecord(unifiedHealth)) return "";

  return (
    getText(unifiedHealth.confidence) ||
    getText(unifiedHealth.confidenceLevel) ||
    getText(unifiedHealth.signalStrength) ||
    getText(unifiedHealth.reliability)
  );
}

export default function UnifiedHealthCard({
  unifiedHealth,
}: UnifiedHealthCardProps) {
  const signals = normalizeUnifiedHealthSignals(unifiedHealth);
  const summary = getUnifiedHealthSummary(unifiedHealth);
  const status = getUnifiedHealthStatus(unifiedHealth);
  const score = getUnifiedHealthScore(unifiedHealth);
  const confidence = getUnifiedHealthConfidence(unifiedHealth);

  const topPriorities = isRecord(unifiedHealth)
    ? getTextList(
        unifiedHealth.topPriorities ||
          unifiedHealth.priorityAreas ||
          unifiedHealth.keyPriorities
      )
    : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Unified Intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Health Intelligence Summary
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A unified view of the patient&apos;s current health signals,
            detected patterns, risk direction, and priority focus areas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {score && (
            <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Score: {score}
            </span>
          )}

          {status && (
            <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Status: {status}
            </span>
          )}

          {confidence && (
            <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Confidence: {confidence}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">{summary}</p>
        </div>
      )}

      {topPriorities.length > 0 && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top Priorities
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {topPriorities.map((priority, index) => (
              <span
                key={`${priority}-${index}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
              >
                {priority}
              </span>
            ))}
          </div>
        </div>
      )}

      {signals.length > 0 ? (
        <div className="grid gap-4">
          {signals.map((item, index) => {
            const title =
              item.title ||
              item.name ||
              item.organ ||
              item.system ||
              item.category ||
              `Unified Health Signal ${index + 1}`;

            const explanation =
              item.insight ||
              item.interpretation ||
              item.summary ||
              item.description;

            const suggestedFocus = item.recommendation || item.action;

            const contextParts = [
              item.organ,
              item.system,
              item.category,
            ].filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0
            );

            return (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {title}
                    </h3>

                    {contextParts.length > 0 && (
                      <p className="mt-1 text-sm text-slate-500">
                        {contextParts.join(" • ")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.priority && (
                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        Priority: {item.priority}
                      </span>
                    )}

                    {item.riskLevel && (
                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        Risk: {item.riskLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Status: {item.status}
                    </span>
                  )}

                  {item.confidence && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Confidence: {item.confidence}
                    </span>
                  )}
                </div>

                {explanation && (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {explanation}
                  </p>
                )}

                {suggestedFocus && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Focus
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {suggestedFocus}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            Unified health intelligence will appear here after OrganHeal
            combines report findings, lab trends, risks, and health strategy
            into one summary.
          </p>
        </div>
      )}
    </section>
  );
}