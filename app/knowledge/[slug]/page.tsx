import { notFound } from "next/navigation";

import Link from "next/link";

import { getKnowledgePackBySlug } from "@/lib/services/knowledge/knowledge-pack.service";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function KnowledgePackPage({
  params,
}: Props) {
  const { slug } = await params;

  const pack = getKnowledgePackBySlug(slug);

  if (!pack) {
    notFound();
  }

  const sections = Object.entries(pack.sections);

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: "0 24px",
      }}
    >
      <Link href="/knowledge">
        ← Back to Knowledge Hub
      </Link>

      <h1
        style={{
          marginTop: 24,
          fontSize: 42,
          fontWeight: 800,
        }}
      >
        {pack.name}
      </h1>

      <p
        style={{
          color: "#64748b",
          marginTop: 10,
          marginBottom: 36,
        }}
      >
        {pack.summary}
      </p>

      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        {sections.map(([key, section]) => (
          <article
            key={key}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2>{section.title}</h2>

            <p
              style={{
                color: "#64748b",
                marginTop: 8,
              }}
            >
              {section.summary}
            </p>

            <div
              style={{
                marginTop: 16,
                fontSize: 14,
                color: "#0f766e",
                fontWeight: 700,
              }}
            >
              Articles: {section.itemIds.length}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}