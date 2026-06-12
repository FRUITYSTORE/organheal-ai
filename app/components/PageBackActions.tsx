"use client";

import { useRouter } from "next/navigation";

export default function PageBackActions() {
  const router = useRouter();

  return (
    <button className="pageBackInlineBtn" onClick={() => router.back()}>
      ← Back
    </button>
  );
}