import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab Analyzer | OrganHeal AI",
  description:
    "Enter or review your lab values and receive an educational health score with insights on cholesterol, HbA1c, vitamin D, and key biomarkers.",
};

export default function LabAnalyzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

