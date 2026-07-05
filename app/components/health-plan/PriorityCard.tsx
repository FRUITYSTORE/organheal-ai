type PriorityCardProps = {
  label: string;
  organ: string;
  riskLabel: string;
  riskLevel: string;
  scoreLabel: string;
  scoreText: string;
  progressPercent: number;
};

export default function PriorityCard({
  label,
  organ,
  riskLabel,
  riskLevel,
  scoreLabel,
  scoreText,
  progressPercent,
}: PriorityCardProps) {
  return (
    <aside className="hpPriorityCard">
      <span className="hpPriorityLabel">{label}</span>

      <div className="hpPriorityValue">{organ}</div>

      <p className="hpPrioritySub">
        {riskLabel}: {riskLevel}
        <br />
        {scoreLabel}: {scoreText}
      </p>

      <div className="hpProgressWrap">
        <div
          className="hpProgressFill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </aside>
  );
}