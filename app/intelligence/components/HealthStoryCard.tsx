type HealthStoryCardProps = {
  story: string;
};

function splitStoryIntoStatements(story: string) {
  return story
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isRepeatedSummaryStatement(statement: string) {
  const normalizedStatement = statement.toLowerCase();

  return (
    normalizedStatement.includes("primary health focus") ||
    normalizedStatement.includes("primary focus area") ||
    normalizedStatement.includes("90-day forecast") ||
    normalizedStatement.includes("forecast confidence") ||
    normalizedStatement.includes("recommended next step") ||
    normalizedStatement.includes("next step is") ||
    normalizedStatement.includes("continue tracking your health data") ||
    normalizedStatement.includes("personalized action plan")
  );
}

function getReasoningStatements(story: string) {
  const statements = splitStoryIntoStatements(story);

  const reasoningStatements = statements.filter(
    (statement) => !isRepeatedSummaryStatement(statement)
  );

  if (reasoningStatements.length > 0) {
    return reasoningStatements.slice(0, 3);
  }

  return statements.slice(0, 2);
}

function getStatementLabel(statement: string, index: number) {
  const text = statement.toLowerCase();

  if (
    text.includes("confidence") ||
    text.includes("evidence") ||
    text.includes("supported")
  ) {
    return "Supporting evidence";
  }

  if (
    text.includes("marker") ||
    text.includes("lab") ||
    text.includes("signal") ||
    text.includes("result")
  ) {
    return "Health signals";
  }

  if (
    text.includes("risk") ||
    text.includes("likelihood") ||
    text.includes("probability")
  ) {
    return "Risk direction";
  }

  if (
    text.includes("trend") ||
    text.includes("momentum") ||
    text.includes("over time") ||
    text.includes("longitudinal")
  ) {
    return "Health trend";
  }

  if (
    text.includes("forecast") ||
    text.includes("future") ||
    text.includes("next")
  ) {
    return "Future outlook";
  }

  if (
    text.includes("because") ||
    text.includes("therefore") ||
    text.includes("based on")
  ) {
    return "Clinical context";
  }

  return index === 0
    ? "Key observation"
    : "Additional context";
}

export default function HealthStoryCard({
  story,
}: HealthStoryCardProps) {
  const reasoningStatements = getReasoningStatements(story);

  if (reasoningStatements.length === 0) {
    return null;
  }

  return (
    <section
      className="ohCard"
      aria-labelledby="health-reasoning-title"
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">OrganHeal AI interpretation</p>

          <h2
            id="health-reasoning-title"
            className="ohCardTitle"
            style={{ marginTop: "8px" }}
          >
            Why OrganHeal reached this view
          </h2>
        </div>

        <span className="ohStatusBadge info">Reasoning</span>
      </div>

      <p
        style={{
          maxWidth: "820px",
          margin: "12px 0 0",
          lineHeight: 1.75,
          color: "var(--oh-text-muted, #52656d)",
        }}
      >
        This explanation highlights the health signals and patterns that
        influenced the summary above, without repeating your priority,
        forecast, or recommended action.
      </p>

      <div className="ohDivider" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "14px",
        }}
      >
        {reasoningStatements.map((statement, index) => (
          <article
            key={`${statement}-${index}`}
            className="ohMetricCard"
            style={{
              minHeight: "150px",
              padding: "20px",
            }}
          >
            <span className="ohMetricLabel">
              {getStatementLabel(statement, index)}
            </span>

            <p
              style={{
                margin: "12px 0 0",
                lineHeight: 1.75,
                color: "var(--oh-text, #17313a)",
              }}
            >
              {statement}
            </p>
          </article>
        ))}
      </div>

      <div
        className="ohTrustNotice"
        style={{
          marginTop: "18px",
          alignItems: "flex-start",
        }}
      >
        <span aria-hidden="true">🔎</span>

        <div>
          <strong>How to read this explanation</strong>

          <p
            style={{
              margin: "6px 0 0",
              lineHeight: 1.7,
            }}
          >
            These statements explain the reasoning behind the current
            interpretation. They are educational insights and should be
            reviewed alongside your original report and professional medical
            advice.
          </p>
        </div>
      </div>
    </section>
  );
}
