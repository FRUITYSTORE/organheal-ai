# OrganHeal Query Audit

> Version: 1.0  
> Status: Active  
> Owner: Hussam  
> Purpose: Track page-level database queries, risks, and optimization progress.

---

## Summary

Production readiness requires every major page to load only the data it needs.

Core rules:

- Use `user_id` filters.
- Use selected columns.
- Avoid `select("*")`.
- Add `limit()` to list queries.
- Avoid loading heavy report text unless required.
- Move AI/PDF/OCR work toward background jobs.

---

## Dashboard

### Current Tables

- `profiles`
- `organ_assessments`
- `daily_checkins`
- `uploaded_lab_files`
- `generated_intelligence_results`
- `health_insights`

### Completed

- Added limits to summary queries.
- Reduced risk of loading full historical data.
- Dashboard remains summary-focused.

### Remaining

- Consider query consolidation later.
- Consider a dashboard summary function/view if query count grows.
- Ensure no future widget adds hidden extra queries.

---

## Reports

### Current Tables

- `uploaded_lab_files`
- `health_insights`
- `generated_intelligence_results`

### Completed

- Added limits to reports queries.
- Replaced `select("*")` with selected columns.
- Compact list and Featured Report reduce visual load.

### Remaining

- Avoid loading `extracted_text` in report list if not needed.
- Move heavy analysis work toward background jobs.
- Consider pagination when reports exceed 50.

---

## Health Plan

### Current Tables

- `organ_assessments`
- `daily_checkins`
- `uploaded_lab_files`
- `health_insights`
- `generated_intelligence_results`
- `health_history`

### Completed

- Uses selected columns.
- Uses limits.
- Uses `Promise.all`.
- No immediate query change required.

### Remaining

- Consider summary function/view later.
- Avoid adding more page-level queries.
- Keep tasks lightweight.

---

## Doctor Portal

### Current Tables

- `organ_assessments`
- `daily_checkins`
- `uploaded_lab_files`
- `health_insights`
- `generated_intelligence_results`
- `health_history`
- RPC: `get_shared_report_by_code`

### Completed

- Added limits to major list queries.
- Simplified page UX.
- Doctor Brief moved higher.
- Shared report access moved lower.

### Remaining

- Confirm RPC underlying table/index.
- Consider doctor summary function/view later.
- Add audit logging before serious doctor/hospital use.

---

## Intelligence Page

### Current Concern

The Intelligence page likely has heavier queries and processing than the summary pages.

### Required Future Audit

- Check `select("*")`.
- Check full `extracted_text` loading.
- Confirm when AI generation runs.
- Ensure saved results are reused.
- Move heavy AI work toward background jobs.

---

## Lab Upload

### Current Concern

File upload and extraction are performance-sensitive.

### Required Future Audit

- File size validation.
- File type validation.
- Upload status handling.
- Extraction status handling.
- Background job migration path.
- Storage access rules.

---

## History

### Current Concern

History can grow indefinitely.

### Required Future Audit

- Limits.
- Pagination.
- Date ranges.
- Avoid loading all historical records.

---

## Query Budget Targets

| Page | Target |
|---|---:|
| Dashboard | 3–4 primary queries |
| Reports | 3 primary queries |
| Health Plan | 5 primary queries |
| Doctor Portal | 5 primary queries |
| Public Pages | 0 private queries |
| Intelligence | Async/background preferred |
| Lab Upload | Async/background preferred |

---

## Rule

If a page becomes slow, count queries before changing UI.