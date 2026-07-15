import type {
  HealthIntelligenceContext,
} from "../context/health-intelligence-context";

import type {
  HealthJourneyData,
} from "../engines/health-journey.engine";

import type {
  HealthPassportData,
} from "../engines/health-passport.engine";

import type {
  HealthTimelineData,
} from "../engines/health-timeline.engine";

export type HealthRuntimeModuleStatus =
  | "ready"
  | "unavailable"
  | "error";

export type HealthRuntimeModuleResult<TData> = {
  status: HealthRuntimeModuleStatus;
  data: TData | null;
  error: string | null;
};

export type HealthIntelligenceRuntimeModules = {
  passport: HealthRuntimeModuleResult<
    HealthPassportData
  >;

  timeline: HealthRuntimeModuleResult<
    HealthTimelineData
  >;

  journey: HealthRuntimeModuleResult<
    HealthJourneyData
  >;
};

export type HealthIntelligenceRuntime = {
  version: "1.0";

  context: HealthIntelligenceContext;

  modules: HealthIntelligenceRuntimeModules;

  readyModuleCount: number;
  unavailableModuleCount: number;
  errorModuleCount: number;

  generatedAt: string;
};
function createModuleResult<T>(
  data: T | null | undefined
): HealthRuntimeModuleResult<T> {
  if (data == null) {
    return {
      status: "unavailable",
      data: null,
      error: null,
    };
  }

  return {
    status: "ready",
    data,
    error: null,
  };
}

export function buildHealthIntelligenceRuntime(
  input: BuildHealthIntelligenceRuntimeInput
): HealthIntelligenceRuntime {
  const modules: HealthIntelligenceRuntimeModules = {
    passport: createModuleResult(input.passport),
    timeline: createModuleResult(input.timeline),
    journey: createModuleResult(input.journey),
  };

  const moduleList = Object.values(modules);

  const readyModuleCount = moduleList.filter(
    (module) => module.status === "ready"
  ).length;

  const unavailableModuleCount = moduleList.filter(
    (module) => module.status === "unavailable"
  ).length;

  const errorModuleCount = moduleList.filter(
    (module) => module.status === "error"
  ).length;

  return {
    version: "1.0",

    context: input.context,

    modules,

    readyModuleCount,
    unavailableModuleCount,
    errorModuleCount,

    generatedAt: new Date().toISOString(),
  };
}
export type BuildHealthIntelligenceRuntimeInput = {
  context: HealthIntelligenceContext;

  passport?: HealthPassportData | null;
  timeline?: HealthTimelineData | null;
  journey?: HealthJourneyData | null;
};