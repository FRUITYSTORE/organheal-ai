"use client";

import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "Start safely",
    features: ["Health assessment", "Upload reports", "Basic dashboard"],
    action: "Create Free Account",
    href: "/signup",
  },
  {
    name: "Personal",
    price: "Coming soon",
    note: "For ongoing health tracking",
    features: ["Report history", "Health plan", "Check-ins", "Priority insights"],
    action: "Join Waitlist",
    href: "/signup",
  },
  {
    name: "Family",
    price: "Coming soon",
    note: "For family health organization",
    features: ["Multiple profiles", "Family report library", "Shared follow-up view"],
    action: "Join Waitlist",
    href: "/signup",
  },
];

export default function PricingPage() {
  return (
    <main className="ohPageShell">
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div>
            <p className="ohEyebrow">Pricing</p>
            <h1 className="ohTitle">Simple plans for personal health clarity.</h1>
            <p className="ohLead">
              Start free. Paid plans will focus on ongoing organization, follow-up, and deeper personal health tracking.
            </p>

            <div className="ohButtonRow" style={{ marginTop: "24px" }}>
              <Link href="/signup" className="primaryBtn">
                Create Free Account
              </Link>
              <Link href="/features" className="secondaryBtn">
                View Features
              </Link>
            </div>
          </div>
        </section>

        <section className="ohGrid cols3">
          {plans.map((plan) => (
            <article className="ohCard" key={plan.name}>
              <p className="ohEyebrow">{plan.note}</p>
              <h2 className="ohCardTitle">{plan.name}</h2>
              <p className="ohMetricValue" style={{ marginTop: "10px" }}>
                {plan.price}
              </p>

              <div className="ohStack" style={{ marginTop: "18px" }}>
                {plan.features.map((feature) => (
                  <p className="ohCardText" key={feature}>
                    ✓ {feature}
                  </p>
                ))}
              </div>

              <Link href={plan.href} className={plan.name === "Free" ? "primaryBtn" : "secondaryBtn"} style={{ marginTop: "22px", width: "100%", justifyContent: "center" }}>
                {plan.action}
              </Link>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div>
            <p className="ohEyebrow">Medical safety</p>
            <h2 className="ohCardTitle">OrganHeal supports understanding, not diagnosis.</h2>
            <p className="ohCardText">
              Pricing will never replace medical care. OrganHeal helps organize information and prepare better health conversations.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}