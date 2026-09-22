import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kidney Health Assessment",
  description:
    "Evaluate kidney-related risk factors including creatinine, systolic blood pressure, diabetes, swelling, and hydration pattern with OrganHeal AI.",
};

export default function KidneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
