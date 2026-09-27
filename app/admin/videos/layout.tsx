import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Videos",
  robots: { index: false, follow: false },
};

export default function VideosAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
