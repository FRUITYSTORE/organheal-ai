import type {
  ComponentProps,
} from "react";

import type DashboardHeroIntelligence from "./DashboardHeroIntelligence";
import type DashboardJourneySection from "./DashboardJourneySection";
import type DashboardNextActionSection from "./DashboardNextActionSection";
import type DashboardOverviewSection from "./DashboardOverviewSection";

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

export type DashboardViewState = {
  hero: HeroProps | null;
  journey: JourneyProps;
  nextAction: NextActionProps;
  overview: OverviewProps;
  healthScore: number | null;
};

export type BuildDashboardViewStateInput = {
  isArabic: boolean;

  dashboardIntelligence:
    HeroProps["intelligence"] | null;

  healthScore: number | null;

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
  };
}