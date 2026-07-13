import Link from "next/link";

import { getPublishedRegisteredKnowledgePacks } from "@/lib/services/knowledge/content-registry.service";

export default function KnowledgeHubPage() {
  const packs = getPublishedRegisteredKnowledgePacks();

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: "0 24px",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          marginBottom: 12,
        }}
      >
        OrganHeal Knowledge Hub
      </h1>

      <p
        style={{
          color: "#64748b",
          marginBottom: 40,
        }}
      >
        Evidence-based medical knowledge organized by organ systems.
      </p>

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns:
            "repeat(auto-fill,minmax(320px,1fr))",
        }}
      >
        {packs.map((pack) => (
          <Link
            key={pack.id}
            href={`/knowledge/${pack.slug}`}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <article
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 24,
                background: "#ffffff",
                transition: "0.2s",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#0891b2",
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                {pack.organ.toUpperCase()}
              </div>

              <h2
                style={{
                  fontSize: 24,
                  marginBottom: 12,
                }}
              >
                {pack.name}
              </h2>

              <p
                style={{
                  color: "#64748b",
                }}
              >
                {pack.summary}
              </p>

              <div
                style={{
                  marginTop: 20,
                  fontWeight: 700,
                  color: "#0f766e",
                }}
              >
                Explore →
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}