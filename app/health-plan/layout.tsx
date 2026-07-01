import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Health Improvement Plan | OrganHeal AI",
  description:
    "Follow a personalized 4-week health improvement plan based on your priority organ score and wellness goals.",
};

export default function HealthPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

