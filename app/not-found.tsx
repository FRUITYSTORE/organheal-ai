export default function NotFound() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">404 PAGE NOT FOUND</p>
          <h1>This page does not exist</h1>
          <p>
            The page you are looking for may have moved, but your health journey
            can still continue with OrganHeal AI.
          </p>
        </div>

        <div className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">Start Here</p>
            <h2>Your health matters</h2>
            <p>
              Return to your dashboard, start an assessment, or review your
              health history.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a href="/dashboard">
                <button className="primaryBtn">Open Dashboard</button>
              </a>

              <a href="/assessment">
                <button className="secondaryBtn">Start Assessment</button>
              </a>

              <a href="/">
                <button className="secondaryBtn">Back Home</button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}