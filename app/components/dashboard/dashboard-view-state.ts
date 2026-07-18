import type {
  ComponentProps,
} from "react";

import type DashboardHeroIntelligence from "./DashboardHeroIntelligence";
import type DashboardJourneySection from "./DashboardJourneySection";
import type DashboardNextActionSection from "./DashboardNextActionSection";
import type DashboardOverviewSection from "./DashboardOverviewSection";
import type HealthDirectionCard from "@/app/components/health-intelligence/HealthDirectionCard";
import type HealthEvidenceCard from "@/app/components/health-intelligence/HealthEvidenceCard";
import type DashboardTimelinePreview from "@/app/components/health-intelligence/DashboardTimelinePreview";
import type DashboardIntelligenceCard from "./DashboardIntelligenceCard";

type HeroProps = ComponentProps<
  typeof DashboardHeroIntelligence
>;

type JourneyProps = ComponentProps<
  typeof DashboardJourneySection
>;

type NextActionProps = ComponentProps<
  typeof DashboardNextActionSection
>;

type OverviewProps = ComponentProps<
  typeof DashboardOverviewSection
>;

type HealthDirectionProps = ComponentProps<
  typeof HealthDirectionCard
>;

type HealthEvidenceProps = ComponentProps<
  typeof HealthEvidenceCard
>;

type DashboardTimelineProps = ComponentProps<
  typeof DashboardTimelinePreview
>;

type DashboardIntelligenceProps = ComponentProps<
  typeof DashboardIntelligenceCard
>;

export type DashboardViewState = {
  hero: HeroProps | null;
  journey: JourneyProps;
  nextAction: NextActionProps;
  overview: OverviewProps;
  healthScore: number | null;
  healthDirection: HealthDirectionProps | null;
  healthEvidence: HealthEvidenceProps | null;
  healthTimeline: DashboardTimelineProps | null;
  healthIntelligenceCard: DashboardIntelligenceProps | null;
};

export type BuildDashboardViewStateInput = {
  isArabic: boolean;

  dashboardIntelligence:
    HeroProps["intelligence"] | null;

  healthScore: number | null;

  trendSummary:
    HealthDirectionProps["summary"] | null | undefined;

  trendConfidence:
    HealthDirectionProps["confidence"] | undefined;

  evidence:
    HealthEvidenceProps["evidence"] | null | undefined;

  evidenceConfidence:
    HealthEvidenceProps["confidence"] | undefined;

  timeline:
    DashboardTimelineProps["timeline"] | null | undefined;

  timelineConfidence:
    DashboardTimelineProps["confidence"] | undefined;

  findings:
    DashboardIntelligenceProps["findings"];

  actionSummary:
    DashboardIntelligenceProps["actionSummary"] | null | undefined;

  journey: Omit<
    JourneyProps,
    "isArabic"
  >;

  nextAction: Omit<
    NextActionProps,
    "isArabic"
  >;

  overview: Omit<
    OverviewProps,
    "isArabic"
  >;
};

export function buildDashboardViewState({
  isArabic,
  dashboardIntelligence,
  healthScore,
  trendSummary,
  trendConfidence,
  evidence,
  evidenceConfidence,
  timeline,
  timelineConfidence,
  findings,
  actionSummary,
  journey,
  nextAction,
  overview,
}: BuildDashboardViewStateInput): DashboardViewState {
  return {
    hero:
      dashboardIntelligence
        ? {
            intelligence:
              dashboardIntelligence,

            isArabic,
          }
        : null,

    journey: {
      ...journey,
      isArabic,
    },

    nextAction: {
      ...nextAction,
      isArabic,
    },

    overview: {
      ...overview,
      isArabic,
    },

    healthScore,

    healthDirection:
      trendSummary &&
      trendConfidence !== undefined
        ? {
            summary: trendSummary,
            confidence: trendConfidence,
            isArabic,
          }
        : null,

    healthEvidence:
      evidence &&
      evidenceConfidence !== undefined
        ? {
            evidence,
            confidence: evidenceConfidence,
            isArabic,
          }
        : null,

    healthTimeline:
      timeline &&
      timelineConfidence !== undefined &&
      timeline.events.length > 0
        ? {
            timeline,
            confidence: timelineConfidence,
            isArabic,
          }
        : null,

    healthIntelligenceCard:
      actionSummary
        ? {
            findings,
            actionSummary,
            isArabic,
          }
        : null,
  };
}