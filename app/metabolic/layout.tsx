import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metabolic Health Assessment",
  description:
    "Evaluate metabolic wellness factors including fasting glucose, total cholesterol, weight pattern, and family history of diabetes with OrganHeal AI.",
};

export default function MetabolicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
