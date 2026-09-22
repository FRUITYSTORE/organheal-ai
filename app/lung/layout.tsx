import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lung Health Assessment",
  description:
    "Evaluate respiratory wellness factors including smoking exposure, shortness of breath, chronic cough, and asthma or wheezing history with OrganHeal AI.",
};

export default function LungLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
