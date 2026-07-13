import Link from "next/link";

import { getPublishedRegisteredKnowledgePacks } from "@/lib/services/knowledge/content-registry.service";

import "./knowledge.css";
import PageHero from "@/app/components/ui/PageHero";

export default function KnowledgeHubPage() {
  const packs = getPublishedRegisteredKnowledgePacks();

  return (
    <main className="knowledgePage">
      <div className="knowledgeHubContainer">
        <PageHero
  eyebrow="Medical Knowledge"
  title="OrganHeal Knowledge Hub"
  description="Evidence-based health education organized into structured knowledge packs for organs, families, patients, and clinicians."
  badge={
    <div
      style={{
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "1.8rem",
          fontWeight: 900,
        }}
      >
        {packs.length}
      </div>

      <div
        style={{
          fontSize: ".75rem",
          opacity: .85,
        }}
      >
        Packs
      </div>
    </div>
  }
/>

        <section className="knowledgeHubIntro">
          <div>
            <span className="knowledgeHubSectionLabel">
              Published Knowledge Packs
            </span>

            <h2>Explore health knowledge by organ system</h2>

            <p>
              Each pack connects educational articles, practical guidance,
              research updates, videos, checklists, and medical sources.
            </p>
          </div>

          <span className="knowledgeHubCount">
            {packs.length} pack{packs.length === 1 ? "" : "s"}
          </span>
        </section>

        {packs.length > 0 ? (
          <div className="knowledgePackGrid">
            {packs.map((pack) => (
              <Link
                key={pack.id}
                href={`/knowledge/${pack.slug}`}
                className="knowledgePackCard"
              >
                <div className="knowledgePackCardTop">
                  <span className="knowledgePackOrgan">
                    {pack.organ}
                  </span>

                  <span className="knowledgePackStatus">
                    Published
                  </span>
                </div>

                <h2>{pack.name}</h2>

                <p>{pack.summary}</p>

                <div className="knowledgePackMeta">
                  <span>Version {pack.version}</span>

                  <span>
                    {Object.values(pack.sections).filter(
                      (section) => section.enabled
                    ).length}{" "}
                    sections
                  </span>
                </div>

                <span className="knowledgePackExplore">
                  Explore knowledge pack →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <section className="knowledgeHubEmpty knowledgeCard">
            <span>Knowledge library</span>

            <h2>Published knowledge packs are being prepared</h2>

            <p>
              Medical content will appear here after scientific review and
              publication.
            </p>
          </section>
        )}

        <section className="knowledgeSafetyNotice">
          <strong>Evidence-based educational content</strong>

          <p>
            OrganHeal knowledge resources support health understanding and
            preparation. They do not replace evaluation, diagnosis, or
            treatment by licensed healthcare professionals.
          </p>
        </section>
      </div>
    </main>
  );
}