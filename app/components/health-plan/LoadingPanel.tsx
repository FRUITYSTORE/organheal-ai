type LoadingPanelProps = {
  kicker: string;
  title: string;
};

export default function LoadingPanel({
  kicker,
  title,
}: LoadingPanelProps) {
  return (
    <section className="hpPanel">
      <div className="hpPanelHeader">
        <div className="hpPanelKicker">{kicker}</div>
        <h2 className="hpPanelTitle">{title}</h2>
      </div>
    </section>
  );
}