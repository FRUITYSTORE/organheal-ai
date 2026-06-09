import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Health Dashboard | OrganHeal AI",
  description:
    "Track your organ health scores, daily wellness check-ins, health goals, trends, and AI-powered insights in your OrganHeal AI dashboard.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}