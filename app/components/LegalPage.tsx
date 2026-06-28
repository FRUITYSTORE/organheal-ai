import Link from "next/link";

type LegalSection = {
  title: string;
  body: string | string[];
};

type LegalPageProps = {
  badge: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export default function LegalPage({
  badge,
  title,
  intro,
  updated,
  sections,
}: LegalPageProps) {
  return (
    <main className="legalPage">
      <section className="legalHero">
        <p className="assistantBadge">{badge}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <span>Last updated: {updated}</span>
      </section>

      <section className="legalContent">
        {sections.map((section) => (
          <div className="legalCard" key={section.title}>
            <h2>{section.title}</h2>

            {Array.isArray(section.body) ? (
              section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p>{section.body}</p>
            )}
          </div>
        ))}

        <div className="legalNotice">
          <strong>Important:</strong> These pages are general informational templates for OrganHeal AI and should be reviewed by a qualified legal professional before commercial launch.
        </div>

        <div className="legalActions">
          <Link href="/" className="secondaryBtn">
            Back to Home
          </Link>

          <Link href="/contact" className="primaryBtn">
            Contact OrganHeal
          </Link>
        </div>
      </section>
    </main>
  );
}
