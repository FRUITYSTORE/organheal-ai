# ADR-0001

## Title

Standardize Query Limits and Performance Budget

---

## Status

Accepted

---

## Date

2026-07

---

## Decision Owners

Hussam

---

# Context

As OrganHeal grows, page performance must remain predictable regardless of
database size.

Several pages originally loaded complete datasets or used broad queries
without an explicit loading strategy.

Although this worked during early development, it would become increasingly
expensive as the number of users, reports, assessments, and AI results grows.

The project therefore requires a consistent database loading philosophy.

---

# Decision

OrganHeal adopts the following engineering standards.

## Query Limits

All list queries must define an explicit limit unless the full dataset is
absolutely required.

Examples include:

- Reports
- Dashboard summaries
- Health History
- Doctor Portal
- Health Plan

---

## Selected Columns

Production pages should avoid:

```ts
.select("*")
```

Instead, pages should request only the columns they actually use.

---

## Performance Budget

Every page should define an expected loading budget.

Typical goals:

| Page | Query Budget |
|------|-------------:|
| Dashboard | 3–4 |
| Reports | ≤3 |
| Health Plan | ≤5 |
| Doctor Portal | ≤5 |
| Public Pages | 0 private queries |

---

## Heavy Operations

The following operations should progressively move toward asynchronous
background processing.

- AI generation
- OCR
- PDF extraction
- Large report processing

The user interface should display processing status rather than blocking the
user.

---

# Rationale

This approach provides:

- Faster page loading
- Better scalability
- Lower database load
- Reduced network traffic
- Better user experience
- Lower future infrastructure costs

---

# Consequences

Positive

- Predictable performance
- Easier performance reviews
- Easier query auditing
- Better production readiness

Trade-offs

- Developers must think about query design.
- Some features require background processing instead of synchronous execution.
- Additional architectural discipline is required.

---

# Related Documents

- docs/00_GOVERNANCE/ENGINEERING_HANDBOOK.md
- docs/ORGANHEAL_ENGINEERING_MASTER.md
- supabase/sql/production_indexes.sql

---

# Review

Review this decision whenever:

- Database schema changes significantly.
- AI processing architecture changes.
- Background Jobs become the default processing model.

Otherwise this decision remains active.