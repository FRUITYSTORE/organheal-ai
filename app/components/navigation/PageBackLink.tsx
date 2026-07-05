import Link from "next/link";

type PageBackLinkProps = {
  href: string;
  label: string;
};

export default function PageBackLink({ href, label }: PageBackLinkProps) {
  return (
    <div className="ohButtonRow pageBackLink">
      <Link href={href} className="secondaryBtn">
        {label}
      </Link>
    </div>
  );
}