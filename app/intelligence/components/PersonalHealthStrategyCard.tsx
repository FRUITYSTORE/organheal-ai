type PersonalHealthStrategy = {
  healthRisks: string;
  actionPlan90Days: string;
  nutritionStrategy: string;
  followUpPlan: string;
};

type PersonalHealthStrategyCardProps = {
  strategy: PersonalHealthStrategy;
};

function StrategySection({
  title,
  badge,
  icon,
  body,
}: {
  title: string;
  badge: string;
  icon: string;
  body: string;
}) {
  return (
    <details className="strategySnapshotCard">
      <summary className="strategySnapshotSummary">
        <div className="strategySnapshotIdentity">
          <span className="strategySnapshotIcon" aria-hidden="true">
            {icon}
          </span>

          <div>
            <span className="strategySnapshotBadge">{badge}</span>

            <h3 className="strategySnapshotTitle">
              {title}
            </h3>
          </div>
        </div>

        <span
          className="strategySnapshotChevron"
          aria-hidden="true"
        >
          ↓
        </span>
      </summary>

      <div className="strategySnapshotBody">
        <p>{body}</p>
      </div>
    </details>
  );
}

export default function PersonalHealthStrategyCard({
  strategy,
}: PersonalHealthStrategyCardProps) {
  return (
    <section className="personalStrategySnapshot">
      <style>{`
        .personalStrategySnapshot,
        .personalStrategySnapshot * {
          box-sizing: border-box;
        }

        .personalStrategySnapshot {
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: #ffffff;
        }

        .strategySnapshotHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .strategySnapshotEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .strategySnapshotHeading {
          margin: 7px 0 0;
          color: #0f172a;
          font-size: clamp(1.3rem, 2vw, 1.7rem);
          font-weight: 950;
          line-height: 1.25;
          letter-spacing: -0.025em;
        }

        .strategySnapshotDescription {
          max-width: 760px;
          margin: 9px 0 0;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .strategySnapshotStatus {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .strategySnapshotGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .strategySnapshotCard {
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #f8fafc 100%
          );
        }

        .strategySnapshotCard[open] {
          border-color: rgba(15, 118, 110, 0.25);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .strategySnapshotSummary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 92px;
          padding: 16px;
          cursor: pointer;
          list-style: none;
        }

        .strategySnapshotSummary::-webkit-details-marker {
          display: none;
        }

        .strategySnapshotSummary:hover {
          background: rgba(240, 253, 250, 0.55);
        }

        .strategySnapshotIdentity {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          gap: 12px;
        }

        .strategySnapshotIcon {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          border-radius: 12px;
          background: #f0fdfa;
          font-size: 1rem;
        }

        .strategySnapshotBadge {
          color: #64748b;
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .strategySnapshotTitle {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .strategySnapshotChevron {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 950;
          transition: transform 180ms ease;
        }

        .strategySnapshotCard[open]
          .strategySnapshotChevron {
          transform: rotate(180deg);
          background: #ecfdf5;
          color: #047857;
        }

        .strategySnapshotBody {
          padding: 0 16px 17px;
          border-top: 1px solid rgba(15, 23, 42, 0.07);
        }

        .strategySnapshotBody p {
          margin: 14px 0 0;
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.7;
          white-space: pre-line;
        }

        @media (max-width: 760px) {
          .strategySnapshotGrid {
            grid-template-columns: 1fr;
          }

          .strategySnapshotHeader {
            flex-direction: column;
          }

          .strategySnapshotStatus {
            align-self: flex-start;
          }
        }
      `}</style>

      <div className="strategySnapshotHeader">
        <div>
          <p className="strategySnapshotEyebrow">
            Personal Health Strategy
          </p>

          <h2 className="strategySnapshotHeading">
            Your strategy at a glance
          </h2>

          <p className="strategySnapshotDescription">
            Review the main risk, action, lifestyle, and follow-up directions.
            Open any section for the full details.
          </p>
        </div>

        <span className="strategySnapshotStatus">
          Strategy
        </span>
      </div>

      <div className="strategySnapshotGrid">
        <StrategySection
          title="Health Risks"
          badge="Risk focus"
          icon="⚠️"
          body={strategy.healthRisks}
        />

        <StrategySection
          title="90-Day Action Plan"
          badge="Action direction"
          icon="📆"
          body={strategy.actionPlan90Days}
        />

        <StrategySection
          title="Nutrition Strategy"
          badge="Lifestyle support"
          icon="🥗"
          body={strategy.nutritionStrategy}
        />

        <StrategySection
          title="Follow-Up Plan"
          badge="Monitoring"
          icon="🩺"
          body={strategy.followUpPlan}
        />
      </div>
    </section>
  );
}