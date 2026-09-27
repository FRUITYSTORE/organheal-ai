import type { Metadata } from "next";

import { getPublishedRegisteredKnowledgePacks } from "@/lib/services/knowledge/content-registry.service";

import KnowledgeHubContent from "./KnowledgeHubContent";

import "./knowledge.css";

export function generateMetadata(): Metadata {
  const packs = getPublishedRegisteredKnowledgePacks();

  return {
    title: "Knowledge Hub",
    description:
      "Evidence-based health education organized into structured knowledge packs for organs, families, patients, and clinicians.",
    // Keep this out of search results while there is nothing published to
    // show — it starts indexing itself the moment a pack goes live.
    robots: packs.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default function KnowledgeHubPage() {
  const packs = getPublishedRegisteredKnowledgePacks().map((pack) => ({
    id: pack.id,
    slug: pack.slug,
    organ: pack.organ,
    name: pack.name,
    summary: pack.summary,
    version: String(pack.version),
    sectionCount: Object.values(pack.sections).filter((section) => section.enabled).length,
  }));

  return (
    <main className="knowledgePage">
      <KnowledgeHubContent packs={packs} />
    </main>
  );
}
