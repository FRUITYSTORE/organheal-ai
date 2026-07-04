import Link from "next/link";

type BackButtonProps = {
  href: string;
  label: string;
};

export default function BackButton({ href, label }: BackButtonProps) {
  return (
    <div className="ohButtonRow">
      <Link href={href} className="secondaryBtn">
        {label}
      </Link>
    </div>
  );
}