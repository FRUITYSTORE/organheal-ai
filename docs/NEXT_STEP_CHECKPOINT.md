# OrganHeal AI — Next Step Checkpoint

## Stable Repository State

Date: 2026-08-02

Branch:

main

Stable commit:

00516d4 complete ask organheal ai reasoning architecture

Verification completed:

- Next.js 16.2.7 production build passed.
- TypeScript validation passed.
- `/api/assistant` is present in the production route output.
- `git diff --check` passed.
- Changes were committed and pushed to `origin/main`.
- Working tree was clean after the push.

---

## Completed Product Phases

### Phase 1 — Product-wide UX Consistency Audit

Status:

100% complete

Completed scope:

- Homepage
- Reports
- Intelligence
- Health Plan
- Ask OrganHeal AI page
- Dashboard
- Lab Upload
- Check-In
- History
- Profile
- Library
- Doctor Portal
- Cross-page journey review

Phase 1 outcomes:

- Removed duplicated actions and unnecessary navigation.
- Clarified the primary responsibility of each page.
- Improved transitions between upload, reports, intelligence, health plan, dashboard, check-in, history, assistant, and doctor preparation.
- Preserved existing stable page architecture instead of introducing random redesigns.

---

### Phase 2 — Ask OrganHeal AI Completion

Status:

100% complete

Stable commit:

00516d4

Completed architecture:

1. Assistant Intent Detection
2. Assistant Intent Types
3. Assistant Intent to Reasoning Intent Mapping
4. Assistant Orchestrator
5. Conversation-aware message handling
6. Assistant Health Context Builder
7. Separation of health-context loading from context transformation
8. Question Evidence Assessment
9. Reasoning Readiness Assessment
10. Clarify-or-answer decision path
11. Structured Clinical Evidence accumulation
12. Evidence-backed reasoning pipeline
13. Hypothesis Generator Registry
14. Evidence Pattern Generator
15. Report Evidence Pattern Generator
16. Central Hypothesis Confidence Calculator
17. Hypothesis candidate evaluation
18. Hypothesis ranking
19. Leading Interpretation selection
20. Explainable Reasoning service
21. Personalized response integration

Phase 2 architectural flow:

User Question
→ Conversation Context
→ Intent Detection
→ Intent Mapping
→ Health Context
→ Evidence Assessment
→ Clarify or Answer Decision
→ Hypothesis Generation
→ Confidence Calculation
→ Candidate Evaluation
→ Ranking
→ Leading Interpretation
→ Explainable Reasoning
→ Personalized Response

Safety rules preserved:

- Interpretations remain non-diagnostic.
- `diagnosticClaim` remains false.
- Missing and conflicting evidence are preserved.
- Confidence is constrained by evidence structure.
- Report findings and user-reported symptoms are not treated as proven causal relationships.
- The assistant distinguishes evidence-backed interpretation from confirmed diagnosis.

---

## Current Phase

# Phase 3 — Unified Patient Journey

Status:

0% complete

Primary goal:

Connect Dashboard, Check-In, History, Health Plan, Reports, Intelligence, and Ask OrganHeal AI into one continuously updated patient journey.

The next phase should not begin with visual redesign.

It should begin by identifying and unifying the shared patient journey state used across the product.

Target journey:

Dashboard
→ Todays Mission
→ Check-In
→ Updated Health Context
→ Dashboard Refresh
→ History
→ Ask OrganHeal AI
→ Doctor Portal

---

## Immediate Next Architectural Task

### Shared Patient Journey State Audit

Review the actual data and decision sources currently used by:

- `app/dashboard/page.tsx`
- `app/checkin/page.tsx`
- `app/history/page.tsx`
- `app/health-plan/page.tsx`
- `lib/getHealthContext.ts`
- Dashboard decision service
- History decision service
- Patient Summary service
- Health Intelligence Runtime

Determine:

1. Which source currently defines the latest patient state.
2. Whether Dashboard, History, Health Plan, and Assistant calculate overlapping values independently.
3. Which fields can become a shared patient journey snapshot.
4. How a saved Check-In should update the next action, history state, and assistant context.
5. Whether an existing runtime or patient summary object can serve as the shared source without adding a duplicate service.

Do not create a new service until existing services and runtime outputs are reviewed.

---

## Phase 3 First Implementation Goal

After the audit, implement one shared journey projection such as:

- current priority
- latest completed action
- latest check-in state
- latest report activity
- current next action
- recent meaningful change
- follow-up readiness
- last updated timestamp

The shared projection should be reused by multiple pages rather than independently recalculated.

---

## Working Rules

1. Work on branch `main` unless a new branch is explicitly approved.
2. One scoped change at a time.
3. Review the current file before editing.
4. Do not request files that are already available.
5. Prefer full-file replacement for small files receiving many edits.
6. For larger files, use exact OLD BLOCK → NEW BLOCK replacement.
7. Do not add random cards or duplicate sections.
8. Do not introduce a new service when an existing service can be extended safely.
9. Preserve Arabic and English support.
10. Preserve UTF-8 without BOM.
11. Do not expose `.env.local` or secret values.
12. Do not change Supabase schema unless explicitly planned.
13. After each scoped change run:

   npx tsc --noEmit
   npm run build
   git diff --check
   git status --short

14. Do not commit until the scoped change is verified.
15. After approval:

   git add .
   git commit
   git push origin main
   git status

---

## Rejected Dashboard Additions

Do not re-add these as separate Dashboard sections:

- Activity Snapshot
- Priority Action Queue
- Intelligence Readiness
- Quick Access Actions
- Health Momentum
- Doctor Visit Prep
- Safety Guardrails
- Weekly Review

Future Dashboard improvements must strengthen the existing command-center structure and patient journey instead of adding duplicated blocks.

---

## Next Action

Begin Phase 3 with a Shared Patient Journey State Audit.

Inspect existing services and runtime outputs before writing new code.