import Link from "next/link";
import { notFound } from "next/navigation";
import "../knowledge.css";

import {
  getKnowledgeItemsForSection,
  getKnowledgePackBySlug,
} from "@/lib/services/knowledge/knowledge-pack.service";

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
      <Link
        href="/knowledge"
        style={{
          color: "#0f766e",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        ← Back to Knowledge Hub
      </Link>

      <header
        style={{
          marginTop: 24,
          marginBottom: 36,
          padding: 28,
          borderRadius: 24,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,118,110,0.92))",
          color: "#ffffff",
        }}
      >
        <span
          style={{
            display: "inline-block",
            marginBottom: 10,
            color: "#67e8f9",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {pack.organ}
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 900,
          }}
        >
          {pack.name}
        </h1>

        <p
          style={{
            maxWidth: 760,
            margin: "14px 0 0",
            color: "#dbeafe",
            lineHeight: 1.7,
          }}
        >
          {pack.summary}
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        {sections.map(([key, section]) => {
          const items = getKnowledgeItemsForSection(
            pack,
            key as keyof typeof pack.sections
          );

          return (
            <section
              key={key}
              style={{
                padding: 24,
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: 24,
                    }}
                  >
                    {section.title}
                  </h2>

                  {section.summary && (
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#64748b",
                        lineHeight: 1.6,
                      }}
                    >
                      {section.summary}
                    </p>
                  )}
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    padding: "7px 11px",
                    borderRadius: 999,
                    background: "#ecfeff",
                    color: "#0e7490",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </div>

              {items.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/knowledge/item/${item.slug}`}
                      style={{
                        display: "block",
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#0891b2",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.type}
                      </span>

                      <strong
                        style={{
                          display: "block",
                          marginTop: 6,
                          color: "#0f172a",
                          fontSize: 18,
                        }}
                      >
                        {item.slug
                          .split("-")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() +
                              part.slice(1)
                          )
                          .join(" ")}
                      </strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    margin: "18px 0 0",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  Content is being prepared for this section.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}