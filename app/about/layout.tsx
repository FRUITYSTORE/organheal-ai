import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "OrganHeal AI's mission is clearer, personal health analysis: understand lab results, track organ health over time, and prepare for doctor visits.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
