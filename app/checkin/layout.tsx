import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Health Check-In | OrganHeal AI",
  description:
    "Track your daily mood, energy, stress, sleep, hydration, physical activity, and wellness score with OrganHeal AI.",
};

export default function CheckInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

