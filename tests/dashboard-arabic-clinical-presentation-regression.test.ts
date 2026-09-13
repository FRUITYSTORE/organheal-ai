import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

function readSource(
  path: string
) {
  return readFileSync(
    resolve(
      process.cwd(),
      path
    ),
    "utf8"
  );
}

const localization =
  readSource(
    "lib/application/dashboard/dashboard-presentation-localization.ts"
  );

const healthDirection =
  readSource(
    "app/components/health-intelligence/HealthDirectionCard.tsx"
  );

const healthEvidence =
  readSource(
    "app/components/health-intelligence/HealthEvidenceCard.tsx"
  );

const healthTimeline =
  readSource(
    "app/components/health-intelligence/DashboardTimelinePreview.tsx"
  );

const dashboardHero =
  readSource(
    "app/components/dashboard/DashboardHeroIntelligence.tsx"
  );

const dashboardPage =
  readSource(
    "app/dashboard/page.tsx"
  );

describe(
  "dashboard Arabic clinical presentation regression",
  () => {
    it(
      "localizes priority assessment findings even when a score is unavailable",
      () => {
        expect(
          localization
        ).not.toContain(
          "!rawOrgan ||\n    !score"
        );

        expect(
          localization
        ).toContain(
          "يحتاج إلى اهتمام ذي أولوية"
        );

        expect(
          localization
        ).toContain(
          "وفق التقييمات المتاحة"
        );
      }
    );

    it(
      "provides a shared organ-name presenter",
      () => {
        expect(
          localization
        ).toContain(
          "export function presentDashboardOrganName"
        );

        expect(
          healthDirection
        ).toContain(
          "presentDashboardOrganName("
        );
      }
    );

    it(
      "does not expose raw trend summary text in Arabic presentation",
      () => {
        expect(
          healthDirection
        ).toContain(
          "const summaryDescription"
        );

        expect(
          healthDirection
        ).toContain(
          "يلخص هذا القسم اتجاه النتائج الصحية المسجلة عبر الزمن"
        );

        expect(
          healthDirection
        ).toContain(
          "{summaryDescription}"
        );
      }
    );

    it(
      "uses localized organ names in trend signals",
      () => {
        expect(
          healthDirection
        ).toContain(
          "presentDashboardOrganName("
        );

        expect(
          healthDirection
        ).toContain(
          "signal.organ,"
        );
      }
    );

    it(
      "does not expose raw health-picture prose in the Arabic hero",
      () => {
        expect(
          dashboardHero
        ).toContain(
          "const presentedHeadline"
        );

        expect(
          dashboardHero
        ).toContain(
          "const presentedNarrative"
        );

        expect(
          dashboardHero
        ).toContain(
          "إشارات صحية تحتاج إلى المتابعة"
        );

        expect(
          dashboardHero
        ).toContain(
          "نحتاج إلى بيانات صحية أكثر"
        );

        expect(
          dashboardHero
        ).toContain(
          "اتجاه صحي إيجابي في بياناتك"
        );

        expect(
          dashboardHero
        ).toContain(
          "اتجاه صحتك المسجل مستقر"
        );
      }
    );

    it(
      "uses safe Arabic presentation for health evidence",
      () => {
        expect(
          healthEvidence
        ).toContain(
          "getArabicEvidenceTitle"
        );

        expect(
          healthEvidence
        ).toContain(
          "getArabicEvidenceDetail"
        );

        expect(
          healthEvidence
        ).toContain(
          "اتجاه الصحة العام"
        );

        expect(
          healthEvidence
        ).toContain(
          "مجال الأولوية الصحية الحالي"
        );

        expect(
          healthEvidence
        ).toContain(
          "الثقة"
        );
      }
    );

    it(
      "uses safe Arabic presentation for timeline events",
      () => {
        expect(
          healthTimeline
        ).toContain(
          "getArabicEventTitle"
        );

        expect(
          healthTimeline
        ).toContain(
          "getArabicEventDescription"
        );

        expect(
          healthTimeline
        ).toContain(
          "تم تحديث اتجاه الصحة"
        );

        expect(
          healthTimeline
        ).toContain(
          "تم حفظ تحليل الذكاء الصحي"
        );

        expect(
          healthTimeline
        ).toContain(
          "تمت إضافة تقرير طبي"
        );
      }
    );

    it(
      "localizes unified dashboard next actions by stable destination",
      () => {
        expect(
          dashboardPage
        ).toContain(
          'unifiedPrimaryAction.href ==='
        );

        expect(
          dashboardPage
        ).toContain(
          '"/doctor-portal"'
        );

        expect(
          dashboardPage
        ).toContain(
          "راجع الإشارة الصحية المهمة"
        );

        expect(
          dashboardPage
        ).toContain(
          "توجد إشارة صحية مهمة تستحق المراجعة"
        );

        expect(
          dashboardPage
        ).toContain(
          "افتح الخطوة التالية"
        );
      }
    );
  }
);