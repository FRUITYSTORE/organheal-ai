import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brain Health Assessment",
  description:
    "Evaluate brain wellness factors including sleep quality, stress level, memory or concentration concerns, and headache frequency with OrganHeal AI.",
};

export default function BrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
