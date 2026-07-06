type FollowUpRoadmapProps = {
  sevenDayKicker: string;
  sevenDayTitle: string;
  sevenDayItems: string[];
  roadmapKicker: string;
  roadmapTitle: string;
  roadmapItems: string[];
};

export default function FollowUpRoadmap({
  sevenDayKicker,
  sevenDayTitle,
  sevenDayItems,
  roadmapKicker,
  roadmapTitle,
  roadmapItems,
}: FollowUpRoadmapProps) {
  return (
    <section className="hpTwoCol">
      <article className="hpPanel">
        <div className="hpPanelHeader">
          <div className="hpPanelKicker">{sevenDayKicker}</div>
          <h2 className="hpPanelTitle">{sevenDayTitle}</h2>
        </div>

        <div className="hpList">
          {sevenDayItems.map((item) => (
            <div className="hpListItem" key={item}>
              {item}
            </div>
          ))}
        </div>
      </article>

      <article className="hpPanel">
        <div className="hpPanelHeader">
          <div className="hpPanelKicker">{roadmapKicker}</div>
          <h2 className="hpPanelTitle">{roadmapTitle}</h2>
        </div>

        <div className="hpList">
          {roadmapItems.map((item) => (
            <div className="hpListItem" key={item}>
              {item}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}