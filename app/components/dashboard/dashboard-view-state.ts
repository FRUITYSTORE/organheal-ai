import type {
  ComponentProps,
} from "react";

import type DashboardHeroIntelligence from "./DashboardHeroIntelligence";
import type DashboardJourneySection from "./DashboardJourneySection";
import type DashboardNextActionSection from "./DashboardNextActionSection";
import type DashboardOverviewSection from "./DashboardOverviewSection";
import type HealthDirectionCard from "@/app/components/health-intelligence/HealthDirectionCard";

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

export type DashboardViewState = {
  hero: HeroProps | null;
  journey: JourneyProps;
  nextAction: NextActionProps;
  overview: OverviewProps;
  healthScore: number | null;
  healthDirection: HealthDirectionProps | null;
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
  };
}