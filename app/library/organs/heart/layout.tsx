import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heart Health Learning",
  description:
    "Start with one heart lesson today. Learn about LDL cholesterol, blood pressure, circulation, and heart risk in plain language.",
};

export default function LibraryOrgansHeartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
