import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doctor Visit Preparation",
  description:
    "Go to your visit with clearer questions. OrganHeal helps you organize what to ask, what to bring, and what to confirm before leaving the clinic.",
};

export default function LibraryDoctorPrepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
