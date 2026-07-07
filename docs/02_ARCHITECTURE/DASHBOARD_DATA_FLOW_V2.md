# Dashboard Data Flow V2

## Current State

Dashboard currently uses 6 Supabase queries:

1. `profiles`
2. `organ_assessments`
3. `daily_checkins`
4. `uploaded_lab_files`
5. `generated_intelligence_results`
6. `health_insights`

## Current Strengths

- Queries are now limited.
- `select("*")` has been removed.
- Dashboard focuses on summary data.
- Heavy processing does not happen directly on Dashboard.

## Current Weakness

Six independent round trips may become inefficient as traffic grows.

## Target State

Reduce Dashboard data loading toward:

- 3 queries in the near term.
- 1 summary RPC or backend summary endpoint in the future.

## Near-Term Plan

Keep the current page stable.

Do not introduce RPC yet.

First, review whether report and intelligence counts can be consolidated.

## Future Plan

Create a dashboard summary function or backend endpoint that returns:

- profile summary
- assessment summary
- latest check-in
- report count
- saved intelligence count
- latest intelligence date

## Rule

No new Dashboard feature should add a new page-load query unless it is clearly justified.