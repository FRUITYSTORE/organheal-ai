type UnifiedHealthPriority = {
  area?: unknown;
  score?: unknown;
  severity?: unknown;
  reason?: unknown;
};

type UnifiedHealthEngineResult = {
  currentProfile?: unknown;
  priorityGoal?: unknown;
  healthForecast?: unknown;
  expectedImprovement?: unknown;
  nextBestAction?: unknown;
  riskLevel?: unknown;
  abnormalMarkers?: unknown;
  topPriorities?: unknown;
  primaryPriority?: unknown;
  secondaryPriority?: unknown;
  thirdPriority?: unknown;
};

export type UnifiedHealthPresentation = {
  summary?: string;
  overallStatus?: string;
  topPriorities: string[];
  signals: Array<{
    id: string;
    title: string;
    status?: string;
    riskLevel?: string;
    priority?: string;
    summary?: string;
    recommendation?: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function normalizePriority(
  value: unknown,
  index: number,
  nextBestAction: string
) {
  if (!isRecord(value)) return null;

  const priority = value as UnifiedHealthPriority;

  const area = getText(priority.area);
  const severity = getText(priority.severity);
  const reason = getText(priority.reason);
  const score = getText(priority.score);

  if (!area && !reason) return null;

  return {
    id: `unified-priority-${index + 1}`,
    title: area || `Health Priority ${index + 1}`,
    status: severity,
    riskLevel: severity,
    priority: score ? `Score ${score}` : severity,
    summary: reason,
    recommendation: index === 0 ? nextBestAction : undefined,
  };
}

export function presentUnifiedHealth(
  value: unknown
): UnifiedHealthPresentation | null {
  if (!isRecord(value)) return null;

  const unifiedHealth = value as UnifiedHealthEngineResult;

  const currentProfile = getText(unifiedHealth.currentProfile);
  const priorityGoal = getText(unifiedHealth.priorityGoal);
  const healthForecast = getText(unifiedHealth.healthForecast);
  const expectedImprovement = getText(
    unifiedHealth.expectedImprovement
  );
  const nextBestAction = getText(unifiedHealth.nextBestAction);
  const riskLevel = getText(unifiedHealth.riskLevel);

  const rawPriorities = Array.isArray(unifiedHealth.topPriorities)
    ? unifiedHealth.topPriorities
    : [];

  const signals = rawPriorities
    .map((priority, index) =>
      normalizePriority(priority, index, nextBestAction)
    )
    .filter(
      (
        signal
      ): signal is NonNullable<
        ReturnType<typeof normalizePriority>
      > => Boolean(signal)
    );

  const topPriorities = signals
    .map((signal) => signal.title)
    .filter(Boolean)
    .slice(0, 3);

  const summaryParts = [
    priorityGoal,
    healthForecast,
    expectedImprovement,
  ].filter(Boolean);

  const summary = summaryParts.join(" ");

  const hasMeaningfulContent = Boolean(
    summary ||
      currentProfile ||
      riskLevel ||
      topPriorities.length > 0 ||
      signals.length > 0
  );

  if (!hasMeaningfulContent) {
    return null;
  }

  return {
    summary: summary || undefined,
    overallStatus: currentProfile || riskLevel || undefined,
    topPriorities,
    signals,
  };
}
