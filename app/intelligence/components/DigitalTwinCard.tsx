import { type CSSProperties } from "react";

import {
  createIntelligenceText,
} from "@/lib/presentation/intelligence/intelligence-ui-text";

type DigitalTwinCardProps = {
  digitalTwin: unknown;
  isArabic: boolean;
};

type DigitalTwinProfile = {
  liverRisk: number;
  cardiovascularRisk: number;
  kidneyRisk: number;
  metabolicRisk: number;
  recoveryPotential: number;
  primarySystem: string;
  profileSummary: string;
};

type SystemTone = "good" | "moderate" | "risk";

type SystemNode = {
  key: "cardiovascular" | "liver" | "kidney" | "metabolic";
  risk: number;
  tone: SystemTone;
  label: string;
  cx: number;
  cy: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }

  return 0;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The digital twin is produced by lib/patientDigitalTwin.ts, which returns
 * a flat { liverRisk, cardiovascularRisk, kidneyRisk, metabolicRisk,
 * recoveryPotential, primarySystem, profileSummary } shape — not a
 * signals/items array. Reading the real shape directly (rather than
 * guessing at alternate field names) is what makes this card actually
 * render instead of permanently falling back to its empty state.
 */
function normalizeDigitalTwin(
  digitalTwin: unknown
): DigitalTwinProfile | null {
  if (!isRecord(digitalTwin)) {
    return null;
  }

  const hasAnyRiskField =
    "liverRisk" in digitalTwin ||
    "cardiovascularRisk" in digitalTwin ||
    "kidneyRisk" in digitalTwin ||
    "metabolicRisk" in digitalTwin;

  if (!hasAnyRiskField) {
    return null;
  }

  return {
    liverRisk: getNumber(digitalTwin.liverRisk),
    cardiovascularRisk: getNumber(digitalTwin.cardiovascularRisk),
    kidneyRisk: getNumber(digitalTwin.kidneyRisk),
    metabolicRisk: getNumber(digitalTwin.metabolicRisk),
    recoveryPotential: getNumber(digitalTwin.recoveryPotential) || 100,
    primarySystem: getText(digitalTwin.primarySystem),
    profileSummary: getText(digitalTwin.profileSummary),
  };
}

function getTone(risk: number): SystemTone {
  if (risk >= 50) return "risk";
  if (risk >= 25) return "moderate";
  return "good";
}

const TONE_COLOR: Record<SystemTone, { fill: string; glow: string }> = {
  good: { fill: "#0f766e", glow: "rgba(15, 118, 110, 0.35)" },
  moderate: { fill: "#b45309", glow: "rgba(180, 83, 9, 0.35)" },
  risk: { fill: "#b91c1c", glow: "rgba(185, 28, 28, 0.35)" },
};

export default function DigitalTwinCard({
  digitalTwin,
  isArabic,
}: DigitalTwinCardProps) {
  const text = createIntelligenceText(isArabic ? "ar" : "en");

  const profile = normalizeDigitalTwin(digitalTwin);

  if (!profile) {
    return (
      <section
        className="digitalHealthModelResult"
        dir={isArabic ? "rtl" : "ltr"}
        lang={isArabic ? "ar" : "en"}
      >
        <style>{`
          .digitalHealthModelResult {
            padding: 20px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 18px;
            background: #ffffff;
          }

          .digitalHealthModelEyebrow {
            margin: 0;
            color: #0f766e;
            font-size: 0.68rem;
            font-weight: 950;
            letter-spacing: 0.09em;
            text-transform: uppercase;
          }

          .digitalHealthModelEmpty {
            margin-top: 14px;
            padding: 14px 15px;
            border: 1px dashed rgba(148, 163, 184, 0.4);
            border-radius: 14px;
            background: #f8fafc;
            color: #64748b;
            font-size: 0.82rem;
            line-height: 1.6;
          }
        `}</style>

        <p className="digitalHealthModelEyebrow">
          {text("Personal health model", "النموذج الصحي الشخصي")}
        </p>

        <div className="digitalHealthModelEmpty">
          {text(
            "A fuller personal health model requires more connected and longitudinal data. OrganHeal will strengthen this model as your health history grows.",
            "يتطلب بناء نموذج صحي شخصي أكثر اكتمالًا المزيد من البيانات الصحية المترابطة والتاريخية. وسيعمل OrganHeal على تقوية هذا النموذج مع نمو تاريخك الصحي."
          )}
        </div>
      </section>
    );
  }

  const systems: SystemNode[] = [
    {
      key: "cardiovascular",
      risk: profile.cardiovascularRisk,
      tone: getTone(profile.cardiovascularRisk),
      label: text("Heart", "القلب"),
      cx: 120,
      cy: 108,
    },
    {
      key: "liver",
      risk: profile.liverRisk,
      tone: getTone(profile.liverRisk),
      label: text("Liver", "الكبد"),
      cx: 152,
      cy: 152,
    },
    {
      key: "kidney",
      risk: profile.kidneyRisk,
      tone: getTone(profile.kidneyRisk),
      label: text("Kidneys", "الكلى"),
      cx: 120,
      cy: 196,
    },
    {
      key: "metabolic",
      risk: profile.metabolicRisk,
      tone: getTone(profile.metabolicRisk),
      label: text("Metabolic", "الاستقلاب"),
      cx: 120,
      cy: 240,
    },
  ];

  const primarySystemNode =
    systems.find((system) =>
      profile.primarySystem
        .toLowerCase()
        .includes(system.key === "cardiovascular" ? "cardio" : system.key)
    ) ?? null;

  const recoveryDashOffset =
    282.6 - (282.6 * profile.recoveryPotential) / 100;

  const toneLabel = (tone: SystemTone) =>
    tone === "good"
      ? text("Stable", "مستقر")
      : tone === "moderate"
        ? text("Needs attention", "يحتاج متابعة")
        : text("Elevated risk", "مخاطر مرتفعة");

  return (
    <section
      className="digitalHealthModelResult"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .digitalHealthModelResult,
        .digitalHealthModelResult * {
          box-sizing: border-box;
        }

        .digitalHealthModelResult {
          padding: 22px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .digitalHealthModelEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .digitalHealthModelTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .digitalHealthModelDescription {
          max-width: 640px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .livingMapLayout {
          display: grid;
          grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
          gap: 24px;
          align-items: center;
          margin-top: 18px;
        }

        .livingMapFigure {
          position: relative;
          display: grid;
          place-items: center;
        }

        .livingMapPulse {
          animation: livingMapPulse 2.4s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes livingMapPulse {
          0%, 100% { opacity: 0.55; r: 13; }
          50% { opacity: 0.15; r: 20; }
        }

        .livingMapRecovery {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .livingMapRecoveryValue {
          font-size: 0.72rem;
          font-weight: 950;
          color: #0f172a;
        }

        .livingMapRecoveryLabel {
          font-size: 0.64rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .livingMapList {
          display: grid;
          gap: 10px;
        }

        .livingMapItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-inline-start: 4px solid var(--tone-color);
        }

        .livingMapItem.isPrimary {
          background: #f0fdfa;
        }

        .livingMapItemLabel {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .livingMapDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--tone-color);
          flex: 0 0 auto;
        }

        .livingMapItemTitle {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 900;
          color: #0f172a;
        }

        .livingMapItemStatus {
          margin: 1px 0 0;
          font-size: 0.72rem;
          color: #64748b;
        }

        .livingMapItemRisk {
          font-size: 0.78rem;
          font-weight: 950;
          color: var(--tone-color);
          white-space: nowrap;
        }

        .digitalHealthModelSignal {
          margin-top: 18px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-inline-start: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .digitalHealthModelSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .digitalHealthModelSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
        }

        @media (max-width: 640px) {
          .digitalHealthModelResult {
            padding: 16px;
          }

          .livingMapLayout {
            grid-template-columns: minmax(0, 1fr);
            justify-items: center;
          }
        }
      `}</style>

      <p className="digitalHealthModelEyebrow">
        {text("Personal health model", "النموذج الصحي الشخصي")}
      </p>

      <h3 className="digitalHealthModelTitle">
        {text("Your living health map", "خريطتك الصحية الحية")}
      </h3>

      <p className="digitalHealthModelDescription">
        {text(
          "A visual model built from your reports. Colors reflect the signal detected for each system right now — it becomes more precise as more reports are added.",
          "نموذج بصري مبني من تقاريرك. الألوان تعكس الإشارة المكتشفة لكل جهاز حاليًا — ويصبح أدق كلما أضفت تقارير أكثر."
        )}
      </p>

      <div className="livingMapLayout">
        <div className="livingMapFigure">
          <svg viewBox="0 0 240 300" width="100%" role="img" aria-hidden="true">
            <path
              d="M85,72 C85,58 155,58 155,72 L163,140 C166,192 159,242 146,282 L94,282 C81,242 74,192 77,140 Z"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <circle cx="120" cy="36" r="26" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />

            {systems.map((system) => {
              const colors = TONE_COLOR[system.tone];
              const isPrimary = primarySystemNode?.key === system.key;

              return (
                <g key={system.key}>
                  {isPrimary && (
                    <circle
                      className="livingMapPulse"
                      cx={system.cx}
                      cy={system.cy}
                      r={13}
                      fill="none"
                      stroke={colors.fill}
                      strokeWidth="2.5"
                    />
                  )}

                  <circle
                    cx={system.cx}
                    cy={system.cy}
                    r={10}
                    fill={colors.fill}
                    opacity={0.92}
                  />
                </g>
              );
            })}
          </svg>

          <div className="livingMapRecovery">
            <svg width="64" height="64" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#0f766e"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="282.6"
                strokeDashoffset={recoveryDashOffset}
                transform="rotate(-90 50 50)"
              />
              <text
                x="50"
                y="56"
                textAnchor="middle"
                fontSize="24"
                fontWeight="950"
                fill="#0f172a"
              >
                {profile.recoveryPotential}
              </text>
            </svg>

            <span className="livingMapRecoveryLabel">
              {text("Recovery potential", "إمكانية التعافي")}
            </span>
          </div>
        </div>

        <div className="livingMapList">
          {systems.map((system) => {
            const isPrimary = primarySystemNode?.key === system.key;

            return (
              <div
                key={system.key}
                className={`livingMapItem ${isPrimary ? "isPrimary" : ""}`}
                style={
                  {
                    "--tone-color": TONE_COLOR[system.tone].fill,
                  } as CSSProperties
                }
              >
                <div className="livingMapItemLabel">
                  <span className="livingMapDot" />
                  <div>
                    <p className="livingMapItemTitle">{system.label}</p>
                    <p className="livingMapItemStatus">
                      {toneLabel(system.tone)}
                      {isPrimary
                        ? ` · ${text("current focus", "التركيز الحالي")}`
                        : ""}
                    </p>
                  </div>
                </div>

                <span className="livingMapItemRisk">{system.risk}/100</span>
              </div>
            );
          })}
        </div>
      </div>

      {profile.profileSummary && (
        <div className="digitalHealthModelSignal">
          <p className="digitalHealthModelSignalLabel">
            {text("Current model summary", "ملخص النموذج الحالي")}
          </p>

          <p className="digitalHealthModelSignalText">
            {profile.profileSummary}
          </p>
        </div>
      )}
    </section>
  );
}
