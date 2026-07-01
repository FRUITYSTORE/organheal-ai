type DigitalTwinCardProps = {
  digitalTwin: unknown;
};

type DigitalTwinSignal = {
  id?: string | number;
  title?: string;
  organ?: string;
  system?: string;
  category?: string;
  status?: string;
  riskLevel?: string;
  confidence?: string;
  signal?: string;
  insight?: string;
  summary?: string;
  description?: string;
  recommendation?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeDigitalTwinSignals(digitalTwin: unknown): DigitalTwinSignal[] {
  if (Array.isArray(digitalTwin)) {
    return digitalTwin.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      organ: getText(item.organ),
      system: getText(item.system),
      category: getText(item.category),
      status: getText(item.status),
      riskLevel: getText(item.riskLevel),
      confidence: getText(item.confidence),
      signal: getText(item.signal),
      insight: getText(item.insight),
      summary: getText(item.summary),
      description: getText(item.description),
      recommendation: getText(item.recommendation),
    }));
  }

  if (!isRecord(digitalTwin)) return [];

  const possibleItems =
    digitalTwin.items ||
    digitalTwin.signals ||
    digitalTwin.systems ||
    digitalTwin.organs ||
    digitalTwin.organSignals ||
    digitalTwin.digitalTwin ||
    digitalTwin.twinSignals ||
    digitalTwin.healthModel;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    organ: getText(item.organ),
    system: getText(item.system),
    category: getText(item.category),
    status: getText(item.status),
    riskLevel: getText(item.riskLevel),
    confidence: getText(item.confidence),
    signal: getText(item.signal),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    recommendation: getText(item.recommendation),
  }));
}

function getDigitalTwinSummary(digitalTwin: unknown): string {
  if (typeof digitalTwin === "string") return digitalTwin;

  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.summary) ||
    getText(digitalTwin.overview) ||
    getText(digitalTwin.narrative) ||
    getText(digitalTwin.description)
  );
}

function getDigitalTwinStatus(digitalTwin: unknown): string {
  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.status) ||
    getText(digitalTwin.overallStatus) ||
    getText(digitalTwin.healthState) ||
    getText(digitalTwin.modelStatus)
  );
}

function getDigitalTwinConfidence(digitalTwin: unknown): string {
  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.confidence) ||
    getText(digitalTwin.confidenceLevel) ||
    getText(digitalTwin.modelConfidence) ||
    getText(digitalTwin.signalStrength)
  );
}

export default function DigitalTwinCard({
  digitalTwin,
}: DigitalTwinCardProps) {
  const signals = normalizeDigitalTwinSignals(digitalTwin);
  const summary = getDigitalTwinSummary(digitalTwin);
  const status = getDigitalTwinStatus(digitalTwin);
  const confidence = getDigitalTwinConfidence(digitalTwin);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Personal Health Model
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Digital Health Twin
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A structured representation of the patient&apos;s current health
            signals, organ patterns, and intelligence model state.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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

      {signals.length > 0 ? (
        <div className="grid gap-4">
          {signals.map((item, index) => {
            const title =
              item.title ||
              item.organ ||
              item.system ||
              item.category ||
              `Digital Twin Signal ${index + 1}`;

            const explanation =
              item.insight || item.summary || item.description || item.signal;

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

                    {(item.organ || item.system || item.category) && (
                      <p className="mt-1 text-sm text-slate-500">
                        {[item.organ, item.system, item.category]
                          .filter((value) => value && value.trim().length > 0)
                          .join(" â€¢ ")}
                      </p>
                    )}
                  </div>

                  {item.riskLevel && (
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Risk: {item.riskLevel}
                    </span>
                  )}
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

                {item.recommendation && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Focus
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {item.recommendation}
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
            Digital health twin intelligence will appear here after OrganHeal
            builds a structured model from the available health data.
          </p>
        </div>
      )}
    </section>
  );
}

