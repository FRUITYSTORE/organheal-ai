# OrganHeal AI — Production Readiness Checklist

## Purpose

This document is the operational checklist for preparing OrganHeal AI for real users, growth, performance, reliability, security, and future scalability.

OrganHeal must not be considered ready for wide launch, paid subscription growth, or heavy marketing until the required items in this checklist are reviewed, tested, and improved.

---

## Core Rule

Every future change should answer at least one of these questions:

- Does it make OrganHeal faster?
- Does it make OrganHeal more reliable?
- Does it make OrganHeal safer?
- Does it reduce user confusion?
- Does it reduce duplicated code or duplicated UX?
- Does it prepare the platform for more users?
- Does it increase real product value?

---
---

## Performance Budget

Each page should have a clear query and loading budget. New features must not add unnecessary database calls or heavy processing to page load.

### Target Query Budget

| Area | Target |
|---|---:|
| Public pages | 0 private queries |
| Dashboard | 3–4 primary queries maximum |
| Reports | 3 primary queries maximum |
| Health Plan | 5 primary queries maximum |
| Doctor Portal | 5 primary queries maximum |
| Report Analysis | Async/background processing preferred |
| PDF extraction | Background job preferred |
| AI generation | Background job preferred |

### Rules

- Any new feature must declare its expected data source.
- Avoid adding queries inside UI components unless required.
- Prefer summary queries over loading full records.
- Prefer `limit()` on all list queries.
- Prefer selected columns over `select("*")`.
- Do not run AI, PDF extraction, OCR, or heavy processing during normal page load.
- Reuse saved/generated results before generating new ones.
- Heavy user actions should move toward a status-based flow: Pending → Processing → Completed.
- If a page becomes slow, first count queries before changing UI.

### Future Goal

Move from page-level multiple queries toward summary views or backend summary functions where appropriate, especially for Dashboard and Doctor Portal.

## Build Rules

Before every commit:

```bash
npm run build
git status