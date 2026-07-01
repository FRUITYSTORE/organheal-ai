# OrganHeal AI Project Context

## Project Identity

OrganHeal AI is being built as a Personal Health Intelligence Operating System.

The goal is not just to create separate health pages. The goal is to connect assessments, lab reports, daily check-ins, health history, intelligence summaries, patient reports, doctor-ready briefs, and follow-up plans into one guided health intelligence journey.

OrganHeal should help the user understand:
- current health status
- organ health risks
- patterns over time
- daily wellness signals
- report interpretation
- doctor-ready summaries
- personalized next steps
- practical follow-up planning

OrganHeal must remain professional, medically cautious, bilingual, and easy to understand.

No secret values, Supabase keys, API keys, or `.env.local` values should ever be stored in documentation or shared in chat.

---

## Technology Stack

The project uses:

- Next.js
- TypeScript
- Supabase
- Vercel
- PowerShell
- VS Code
- Git / GitHub

Local project path:

C:\Users\baraa\organheal-ai

Local development URL:

http://localhost:3000

Production URL:

https://www.organheal.com

---

## Important Pages Structure

Important app routes include:

- `/dashboard`
- `/intelligence`
- `/health-plan`
- `/checkin`
- `/lab-analyzer`
- `/lab-upload`
- `/reports`
- `/doctor-portal`
- `/organ-report`
- `/profile`
- organ pages:
  - `/heart`
  - `/liver`
  - `/lung`
  - `/kidney`
  - `/brain`
  - `/metabolic`

---

## Dashboard Command Center Current State

Dashboard file location:

app/dashboard/page.tsx

The Dashboard is being upgraded as the OrganHeal Command Center.

Current Dashboard includes:

- Hero / Welcome section
- Health journey readiness card
- Overview cards
- Journey Timeline Step 3
- Health intelligence snapshot
- Next action panel
- Quick actions
- Arabic / English support

The Dashboard reads and reflects the user's health journey state using existing project data such as:

- assessments
- latest daily check-in
- uploaded reports count
- saved intelligence count
- latest intelligence date
- health intelligence builder output

The Dashboard must remain a command center, not a cluttered page.

---

## Dashboard Journey Timeline Fix

The Journey Timeline Step 3 was fixed using inline JSX data.

Important lesson:

Do not rely on separate variables named:

- journeyTimeline
- nextJourneyItem

because they caused TypeScript scope/build errors.

Stable approach used:

- Replace `nextJourneyItem` with existing `nextStep`.
- Inline the timeline array directly inside JSX mapping.
- Keep the timeline close to where it renders to avoid scope errors.

This fixed the previous errors:

- Cannot find name `nextJourneyItem`
- Cannot find name `journeyTimeline`

After the inline JSX fix, `npm run build` succeeded.

---

## Dashboard Sections That Should NOT Be Re-Added

The following Dashboard sections were previously considered duplicated, unnecessary, or rejected for the current Dashboard direction.

Do not re-add them as separate new sections:

- Activity Snapshot
- Priority Action Queue
- Intelligence Readiness
- Quick Access Actions
- Health Momentum
- Doctor Visit Prep
- Safety Guardrails
- Weekly Review

Reason:

The Dashboard already has:
- overview cards
- journey timeline
- health intelligence snapshot
- next action panel
- quick actions

Any future Dashboard improvement should polish the existing design, not add duplicated blocks.

---

## Intelligence Center Current State

Intelligence Center file location:

app/intelligence/page.tsx

Intelligence components folder:

app/intelligence/components

Known Intelligence components:

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

The Intelligence Center has already gone through Arabic / English improvements and PDF/report improvements. It should remain focused on building a clear journey from uploaded data to intelligence output to patient-friendly and doctor-ready summaries.

---

## Health Plan Current State

Health Plan file location:

app/health-plan/page.tsx

Health Plan has been upgraded and verified.

Important completed items:

- Arabic / English support
- Health Plan command center
- action tasks
- 7 / 30 / 90 day follow-up direction
- printable report / save PDF
- visible print button
- task progress fix
- progress capped at 100%
- old 171% bug fixed

Important lesson:

When task completion is stored in localStorage, only count tasks that exist in the current active plan. Do not allow stale localStorage tasks to inflate the progress.

---

## Check-In Current State

Check-In file location:

app/checkin/page.tsx

Check-In has been upgraded and production verified.

Completed items:

- Arabic Check-In
- English Check-In
- Save / Update Today Check-In
- Weekly wellness pattern
- Check-In to Health Plan connection
- latest check-in connection to Dashboard / Health Plan

The Check-In page uses the existing `daily_checkins` table and should not require schema changes unless a future step explicitly plans them.

---

## Core Work Rules

Always follow these rules before any OrganHeal code work:

1. Use PowerShell only.
2. Start by checking the current branch:

   git branch --show-current

3. Check the working tree:

   git status

4. Run build before adding new work:

   npm run build

5. Make only one scoped change at a time.
6. Do not add random features.
7. Do not duplicate existing sections.
8. Respect Arabic and English.
9. Preserve UTF-8 encoding.
10. Do not expose or store `.env.local` secrets.
11. Do not change Supabase schema unless specifically planned.
12. After successful build:
    - git add
    - git commit
    - git push
    - git status

Recommended safe pattern:

- inspect
- patch
- build
- local test
- commit
- push
- status

Do not continue to the next step until the current step builds successfully.

---

## Safe Patch Lessons Learned

Prefer low-risk patches.

Avoid inserting variables far away from JSX unless the scope is verified.

For Dashboard Timeline, prefer inline JSX data when it prevents scope problems.

When replacing code:
- search exact text first
- keep changes small
- do not apply multiple unrelated changes in one patch
- always run `npm run build` immediately after
- if build fails, stop and fix before continuing

---

## Current Strategic Direction

OrganHeal should evolve into a trustworthy Personal Health Intelligence Operating System.

The system should connect:

- Assessment
- Lab Upload
- Lab Analyzer
- Intelligence Center
- Check-In
- Health Plan
- Reports
- Doctor Portal
- Profile
- Organ pages

The user experience should feel like a guided journey, not a collection of disconnected pages.


---

## Intelligence Center Latest Stable State

The Intelligence Center has completed a QA and polish pass.

Stable improvements completed:

- Fixed the Show Less button JSX structure.
- Removed duplicated GeneratedReportDetailsCard rendering from the expanded report result view.
- Reordered generated intelligence result cards into a clearer user journey.
- Kept PatientReportPdfCard and DoctorBriefReportCard as the two main report outputs.
- Preserved deeper intelligence cards after the patient and doctor summaries.
- Confirmed /intelligence visual QA passed.
- Dashboard was not modified.

Current Intelligence result flow:

1. Patient-friendly PDF report
2. Doctor-ready brief
3. Executive summary
4. Health story
5. Personal health strategy
6. Action plan
7. Unified health intelligence
8. Timeline
9. Lab trends
10. Longitudinal risk
11. Cross-source intelligence
12. Digital twin
13. Forecast
14. Next step toward Reports, Health Plan, or Dashboard

Next logical work:

- Health Plan connection QA
- Confirm that the Intelligence Center to Health Plan journey is clear and not duplicated.

---

# Public Readiness + Private Protection Checkpoint

Date: 2026-07-01

## Completed Phase

OrganHeal AI public experience was cleaned and stabilized so the platform appears as a mature health intelligence product, not as a construction roadmap.

## Public UI Rules Now Approved

- Do not expose unfinished pricing, billing, subscriptions, Plus, Premium, future plans, or roadmap language in public UI.
- Do not use public labels such as Soon, Planned, Future, Later, In production, Price to be announced, or No payment is active.
- Unfinished modules must stay in internal backlog/checkpoint files, not public pages.
- Public visitor navigation should stay focused on:
  - Home
  - Features
  - Health Learning Hub
  - Blog / Article Finder
  - About
  - Contact
  - Signup
  - Login

## Completed Cleanups

- Pricing page hidden from public experience and redirected to Features.
- Footer no longer shows Compare Plans.
- Homepage cleaned from Free / Plus / Pricing / Subscription language.
- Learning Hub redesigned to show clear visitor path, featured guides, article finder, learning routes, and available content.
- Blog discovery improved as article search/filter experience.
- Article reading page improved for focused reading.
- Features page cleaned from planned/future product language.
- Onboarding cleaned from Pricing / Plus / View Plans / later language.
- Navbar and Footer checked for public clarity.

## Private Protection Added

- RouteAccessGuard added to protect private workspace routes.
- Login now supports return path using ?next= so users return to the protected page they wanted after login.
- Sitemap cleaned to include only mature public pages.
- Robots disallow private workspace, admin, pricing, onboarding, reset-password, and API routes.
- Proxy headers added with X-Robots-Tag: noindex, nofollow, noarchive for private/non-public routes.

## Protected Private Routes

- /dashboard
- /reports
- /intelligence
- /health-plan
- /history
- /profile
- /lab-upload
- /checkin
- /organ-report
- /admin

## Public Routes That Should Remain Indexable

- /
- /features
- /library
- /blog
- /blog/[slug]
- /about
- /contact
- /privacy
- /terms
- /medical-disclaimer

## Current Working Rule

Before building new features, validate the real user journey:

Visitor → Signup → Email confirmation → Login → Onboarding → Dashboard

Existing user:

Protected route → Login with next path → Return to requested private workspace page

## Next Step

Functional Signup/Login Journey Validation

Do not start a new feature page before this journey is tested and confirmed.


---

# Functional Signup/Login Journey Validation Result

Date: 2026-07-01

## Result

PASS

## Confirmed Working Flow

- Signup page opens correctly.
- New account creation works.
- Email confirmation is required.
- User does not enter private workspace before confirmation.
- After confirmation, user can login.
- New user is routed to onboarding.
- Onboarding opens correctly.
- Protected route return path works:
  - /health-plan → /login?next=/health-plan → returns to /health-plan
  - /reports → /login?next=/reports → returns to /reports
  - /intelligence → /login?next=/intelligence → returns to /intelligence

## Current Stable State

Public readiness, private route protection, SEO protection, login return path, and new-user entry flow are confirmed.

## Next Recommended Validation

Assessment-to-Dashboard Flow Validation

Goal:
Confirm that a new user can start an assessment, complete it, save results, and then see the expected state on Dashboard.

Do not start a new feature before validating the assessment-to-dashboard flow.


---

# Assessment-to-Dashboard Flow Validation Result

Date: 2026-07-01

## Result

PASS

## Confirmed Working Flow

- Assessment page opens correctly for logged-in user.
- User can complete an assessment.
- Assessment saves successfully.
- Dashboard opens after assessment.
- Dashboard reflects user progress without broken empty state.
- No blocking terminal/build errors were reported.

## Current Stable Product Flow

Visitor → Signup → Email Confirmation → Login → Onboarding → Assessment → Dashboard

Protected page → Login with next path → Return to requested private page

## Next Recommended Validation

Report Upload-to-Reports Flow Validation

Goal:
Confirm that a logged-in user can upload a medical report, save it correctly, and see the uploaded report reflected in Reports/Dashboard context.

Do not start a new feature before validating report upload and reports flow.

