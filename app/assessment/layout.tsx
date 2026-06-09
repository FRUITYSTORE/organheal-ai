import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organ Health Assessment | OrganHeal AI",
  description:
    "Start guided organ health assessments for heart, lung, kidney, liver, brain, and metabolic wellness using OrganHeal AI.",
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}