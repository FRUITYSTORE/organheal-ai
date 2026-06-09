import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health History & Trends | OrganHeal AI",
  description:
    "Review your organ health history, wellness check-ins, progress charts, trend intelligence, milestones, and health goals over time.",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}