import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heart Health Assessment | OrganHeal AI",
  description:
    "Assess your cardiovascular health using blood pressure, cholesterol, diabetes, smoking, and lifestyle risk factors with OrganHeal AI.",
};

export default function HeartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}