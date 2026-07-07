type TrustNoticeProps = {
  icon?: string;
  title: string;
  description: string;
  className?: string;
};

export default function TrustNotice({
  icon = "🛡️",
  title,
  description,
  className = "",
}: TrustNoticeProps) {
  return (
    <section className={`ohTrustNotice ${className}`.trim()}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <br />
        {description}
      </div>
    </section>
  );
}