import PageBackLink from "./PageBackLink";

type PageHeaderProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <>
      <PageBackLink href={backHref} label={backLabel} />

      <section className="ohHero">
        <p className="ohEyebrow">{eyebrow}</p>
        <h1 className="ohTitle">{title}</h1>
        <p className="ohLead">{description}</p>
      </section>
    </>
  );
}