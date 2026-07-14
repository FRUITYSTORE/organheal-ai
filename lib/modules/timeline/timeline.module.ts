import type { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import type { HealthTimelineData } from "@/lib/health-intelligence/engines/health-timeline.engine";
import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export type TimelineModuleResult =
  EngineResult<HealthTimelineData>;

export function getTimelineFromIntelligence(
  intelligence: HealthIntelligenceResult
): TimelineModuleResult {
  return intelligence.timeline;
}