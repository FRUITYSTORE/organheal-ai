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
    features: ["Report history", "Health plan", "Check-ins", "Personal tracking"],
    action: "Request Personal Access",
    href: "/contact?plan=personal",
  },
  {
    name: "Family",
    price: "Coming soon",
    note: "For family health organization",
    features: ["Multiple profiles", "Family reports", "Shared follow-up"],
    action: "Request Family Access",
    href: "/contact?plan=family",
  },
];

export default function PricingPage() {
  return (
    <main className="ohPageShell">
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>

      <style>{`
        .pricingGrid {
          direction: ltr;
        }

        .pricingCard {
          min-height: 360px;
          display: flex;
          flex-direction: column;
          padding: 28px;
        }

        .pricingCardPrimary {
          border: 2px solid rgba(20, 184, 166, 0.55);
          box-shadow: 0 24px 60px rgba(15, 118, 110, 0.16);
        }

        .pricingCard .ohStack {
          flex: 1;
        }

        .pricingCard > a {
          margin-top: auto !important;
          width: 100% !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }

        .pricingCard .primaryBtn,
        .pricingCard .secondaryBtn {
          min-height: 48px;
          border-radius: 16px;
          font-weight: 950;
        }
      `}</style>

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

        <section className="ohGrid cols3 pricingGrid">
          {plans.map((plan) => (
            <article className={plan.name === "Free" ? "ohCard pricingCard pricingCardPrimary" : "ohCard pricingCard"} key={plan.name}>
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