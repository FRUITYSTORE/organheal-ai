# OrganHeal Next Step Checkpoint

## Last Stable Point

The last stable point is:

- Branch: dashboard-command-center
- Dashboard build succeeded after fixing Journey Timeline Step 3.
- Dashboard is stable with Journey Timeline Step 3.
- Journey Timeline was fixed using inline JSX data instead of separate `journeyTimeline` and `nextJourneyItem` variables.
- `nextJourneyItem` was replaced with existing `nextStep`.
- `npm run build` succeeded after the fix.

Current Dashboard file:

app/dashboard/page.tsx

Current Dashboard contains:

- Hero / Welcome
- Health journey readiness
- Overview cards
- Journey Timeline Step 3
- Health intelligence snapshot
- Next action panel
- Quick actions
- Arabic / English support

---

## Current Branch

Expected current branch:

dashboard-command-center

Always verify with:

git branch --show-current

---

## Intelligence Center Status

Intelligence components exist and are connected.

Main file:

app/intelligence/page.tsx

Components folder:

app/intelligence/components

Important components:

- ExecutiveSummaryCard
- HealthStoryCard
- ActionPlanCard
- TimelineCard
- LongitudinalRiskCard
- LabTrendsCard
- CrossSourceCard
- DigitalTwinCard
- ForecastCard
- UnifiedHealthCard

These components are imported and used inside:

app/intelligence/page.tsx

---

## What NOT To Do Next

The next step is not to add more Dashboard sections.

Do not add these as separate sections:

- Activity Snapshot
- Priority Action Queue
- Intelligence Readiness
- Quick Access Actions
- Health Momentum
- Doctor Visit Prep
- Safety Guardrails
- Weekly Review

These were duplicated / rejected for the current Dashboard direction.

The Dashboard should be polished inside the current design, not expanded with repeated blocks.

---

## Next Logical Work

The next logical step should be one of:

1. Intelligence Center QA

or

2. Dashboard polish inside the existing design only

No new feature should be added before checking the current stable state.

---

## Required Reading Before Any New Work

Before starting any new chat or new work, read:

docs/ORGANHEAL_PROJECT_CONTEXT.md

docs/NEXT_STEP_CHECKPOINT.md

---

## Required Startup Commands

Run these first:

git branch --show-current

git status

npm run build

Do not continue if build fails.

---

## Intelligence Center QA Files To Inspect

Inspect:

app/intelligence/page.tsx

app/intelligence/components/*.tsx

Useful PowerShell commands:

Get-Content app/intelligence/page.tsx -TotalCount 260

Get-ChildItem app/intelligence/components -Filter *.tsx

Select-String -Path app/intelligence/page.tsx -Pattern "ExecutiveSummaryCard|HealthStoryCard|ActionPlanCard|TimelineCard|LongitudinalRiskCard|LabTrendsCard|CrossSourceCard|DigitalTwinCard|ForecastCard|UnifiedHealthCard|return|isArabic|language|pdf|doctor|report" -Context 2,4

---

## Goal Of The Next QA Step

The next QA step should answer:

- Is the card order correct?
- Is there any duplication?
- Are empty states clear?
- Is Arabic supported correctly?
- Is English supported correctly?
- Does `/intelligence` give a clear journey from upload to intelligence to doctor-ready summary?
- Is the patient-friendly summary clear?
- Is the doctor-ready summary clear?
- Are PDF/report sections still stable?
- Are there any broken Arabic strings or encoding issues?
- Is there any unnecessary section that should be removed or merged?

---

## Required Work Discipline

Use PowerShell only.

Make one scoped change at a time.

Never add random features.

Never repeat rejected Dashboard sections.

Preserve UTF-8.

Never store secrets.

Never store `.env.local` values.

After any change:

npm run build

git status

If build succeeds:

git add <changed-files>

git commit -m "<clear message>"

git push

git status


---

## Intelligence Center Stable QA Update

Current stable point:

- Intelligence Center QA completed.
- Show Less JSX issue was fixed.
- Duplicate GeneratedReportDetailsCard display was removed from app/intelligence/page.tsx.
- Intelligence result cards were reordered for a clearer journey.
- Current expanded report journey order:
  - PatientReportPdfCard
  - DoctorBriefReportCard
  - ExecutiveSummaryCard
  - HealthStoryCard
  - PersonalHealthStrategyCard
  - ActionPlanCard
  - UnifiedHealthCard
  - TimelineCard
  - LabTrendsCard
  - LongitudinalRiskCard
  - CrossSourceCard
  - DigitalTwinCard
  - ForecastCard
  - Next Step block

Build status:

- npm run build succeeded after the changes.
- Browser QA passed for /intelligence.
- Dashboard was not changed.
- No rejected Dashboard sections were re-added.

Next safe step:

- Either mark Intelligence Center as stable and move to Health Plan connection QA,
- or inspect /health-plan to confirm the Intelligence Center to Health Plan journey is clear.

Do not add new Dashboard sections.
Do not add random features.
Keep changes scoped and build after each change.

---

## Health Plan Connection QA Stable Update

Current stable point:

- Health Plan connection QA completed.
- /health-plan correctly reads assessments, reports, generated intelligence, check-ins, and health history.
- Health Plan detects whether generated intelligence exists using generated_intelligence_results.
- If reports exist but generated intelligence is missing, the next best action points to /intelligence.
- If generated intelligence exists, Health Plan reflects it in readiness, metrics, and reports/intelligence sections.
- Health Plan includes direct links to Reports and Intelligence Center.
- No code change was required.
- Dashboard was not modified.
- Intelligence Center remains stable.

Next safe step:

- Move to Reports / Lab Upload connection QA,
- or update project context and keep Health Plan marked as stable.
