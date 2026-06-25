type HealthStoryCardProps = {
  story: string;
};

export default function HealthStoryCard({ story }: HealthStoryCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">Your Health Story</p>
      <p style={{ whiteSpace: "pre-line" }}>{story}</p>
    </div>
  );
}