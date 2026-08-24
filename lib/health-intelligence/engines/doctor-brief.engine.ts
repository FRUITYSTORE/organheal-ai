import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

import type {
  EngineResult,
} from "@/lib/health-intelligence/models/engine-result";

import type {
  PatientPriorityResult,
} from "@/lib/health-intelligence/engines/priority.engine";

import type {
  HealthRiskResult,
} from "@/lib/health-intelligence/engines/risk.engine";

import type {
  HealthRecommendation,
  RecommendationData,
} from "@/lib/health-intelligence/engines/recommendation.engine";

import type {
  HealthScoreData,
} from "@/lib/health-intelligence/engines/health-score.engine";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type DoctorClinicalData = {
  profile: string;

  priorityOrgan:
    string | null;

  strongestOrgan:
    string | null;

  riskPattern: string;

  healthScore: number;

  healthLevel:
    HealthScoreData["level"];

  recommendedAction:
    HealthRecommendation;

  keyFindings:
    ClinicalFinding[];
};

export type DoctorBriefData =
  DoctorClinicalData & {
    brief: string;
  };

type BuildDoctorBriefInput = {
  patient:
    PatientSummary;

  findings:
    ClinicalFinding[];

  priority:
    PatientPriorityResult;

  risk:
    HealthRiskResult;

  recommendations:
    EngineResult<RecommendationData>;

  healthScore:
    EngineResult<HealthScoreData>;

  wholeBodyKnowledge:
    WholeBodyClinicalKnowledgeModel;
};

function getStrongestOrgan(
  patient:
    PatientSummary
): string | null {
  if (
    !patient.assessments.length
  ) {
    return null;
  }

  return [
    ...patient.assessments,
  ].sort(
    (a, b) =>
      b.score -
      a.score
  )[0]?.organ_name ??
    null;
}

function getProfile(
  score: number,
  priorityOrgan:
    string | null
): string {
  if (
    score >= 85
  ) {
    return "Preventive Health Profile";
  }

  if (
    score >= 70
  ) {
    return "Balanced Health Profile";
  }

  if (
    priorityOrgan ===
      "Heart" ||
    priorityOrgan ===
      "Metabolic"
  ) {
    return "Cardiometabolic Risk Profile";
  }

  if (
    priorityOrgan ===
    "Brain"
  ) {
    return "Brain & Recovery Profile";
  }

  return "Health Improvement Profile";
}

function getRiskPattern(
  overallRisk: string,
  priorityOrgan:
    string | null,
  wellnessScore:
    number | null
): string {
  if (
    priorityOrgan ===
      "Heart" ||
    priorityOrgan ===
      "Metabolic"
  ) {
    return "Cardiometabolic Risk Pattern";
  }

  if (
    priorityOrgan ===
      "Brain" ||
    (
      wellnessScore !==
        null &&
      wellnessScore <
        65
    )
  ) {
    return "Recovery & Stress Pattern";
  }

  if (
    overallRisk ===
    "low"
  ) {
    return "Stable Preventive Health Pattern";
  }

  return "General Health Monitoring Pattern";
}

function buildLongitudinalContext(
  knowledge:
    WholeBodyClinicalKnowledgeModel
): string[] {
  const nodesById =
    new Map(
      knowledge.nodes.map(
        (node) => [
          node.id,
          node,
        ]
      )
    );

  const contexts =
    knowledge.relationships
      .filter(
        (relationship) =>
          relationship.type ===
            "temporal"
      )
      .map(
        (relationship) => {
          const sourceNode =
            nodesById.get(
              relationship.sourceNodeId
            );

          const targetNode =
            nodesById.get(
              relationship.targetNodeId
            );

          if (
            !sourceNode ||
            !targetNode
          ) {
            return null;
          }

          const sharedDomains =
            sourceNode.domains.filter(
              (domain) =>
                domain !==
                  "general-systemic" &&
                targetNode.domains.includes(
                  domain
                )
            );

          if (
            sharedDomains.length ===
            0
          ) {
            return null;
          }

          return `${sharedDomains.join(
            ", "
          )}: longitudinal context is available across separate reports.`;
        }
      )
      .filter(
        (
          context
        ): context is string =>
          context !==
          null
      );

  return [
    ...new Set(
      contexts
    ),
  ];
}

function buildBriefText({
  profile,
  score,
  priorityOrgan,
  strongestOrgan,
  riskPattern,
  overallRisk,
  recommendedAction,
  findings,
  longitudinalContext,
}: {
  profile: string;

  score: number;

  priorityOrgan:
    string | null;

  strongestOrgan:
    string | null;

  riskPattern: string;

  overallRisk: string;

  recommendedAction:
    HealthRecommendation;

  findings:
    ClinicalFinding[];

  longitudinalContext:
    string[];
}): string {
  const findingsText =
    findings.length > 0
      ? findings
          .slice(
            0,
            3
          )
          .map(
            (
              finding,
              index
            ) =>
              `${index + 1}. ${finding.title}: ${finding.description}`
          )
          .join(
            "\n"
          )
      : "No structured clinical findings are currently available.";

  const longitudinalText =
    longitudinalContext.length >
    0
      ? longitudinalContext
          .map(
            (
              context,
              index
            ) =>
              `${index + 1}. ${context}`
          )
          .join(
            "\n"
          )
      : null;

  return [
    `Profile: ${profile}`,
    "",
    `Health Intelligence Score: ${score}/100`,
    "",
    `Overall Risk: ${overallRisk}`,
    "",
    `Priority Area: ${priorityOrgan || "General Health"}`,
    "",
    `Strongest Area: ${strongestOrgan || "General Health"}`,
    "",
    `Risk Pattern: ${riskPattern}`,
    "",
    "Key Clinical Findings:",
    findingsText,

    ...(longitudinalText
      ? [
          "",
          "Longitudinal Context:",
          longitudinalText,
        ]
      : []),

    "",
    `Recommended Action: ${recommendedAction.description}`,
  ].join(
    "\n"
  );
}

export function generateDoctorBrief({
  patient,
  findings,
  priority,
  risk,
  recommendations,
  healthScore,
  wholeBodyKnowledge,
}: BuildDoctorBriefInput):
  EngineResult<DoctorBriefData> {
  const priorityOrgan =
    priority.data
      .priorityOrgan;

  const strongestOrgan =
    getStrongestOrgan(
      patient
    );

  const score =
    healthScore.data
      .score;

  const overallRisk =
    risk.data
      .overallRisk;

  const wellnessScore =
    patient.latestCheckIn
      ?.wellness_score ??
    null;

  const profile =
    getProfile(
      score,
      priorityOrgan
    );

  const riskPattern =
    getRiskPattern(
      overallRisk,
      priorityOrgan,
      wellnessScore
    );

  const recommendedAction =
    recommendations.data
      .primaryAction;

  const keyFindings =
    findings.slice(
      0,
      3
    );

  const longitudinalContext =
    buildLongitudinalContext(
      wholeBodyKnowledge
    );

  const brief =
    buildBriefText({
      profile,
      score,
      priorityOrgan,
      strongestOrgan,
      riskPattern,
      overallRisk,
      recommendedAction,
      findings:
        keyFindings,
      longitudinalContext,
    });

  const confidence =
    Math.round(
      (
        healthScore.confidence +
        priority.confidence +
        risk.confidence +
        recommendations.confidence
      ) /
        4
    );

  return {
    status:
      healthScore.status ===
        "ready" ||
      priority.status ===
        "ready"
        ? "ready"
        : "insufficient-data",

    confidence,

    generatedAt:
      new Date()
        .toISOString(),

    data: {
      brief,

      profile,

      priorityOrgan,

      strongestOrgan,

      riskPattern,

      healthScore:
        score,

      healthLevel:
        healthScore.data
          .level,

      recommendedAction,

      keyFindings,
    },
  };
}