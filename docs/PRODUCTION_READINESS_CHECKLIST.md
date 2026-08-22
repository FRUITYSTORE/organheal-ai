# OrganHeal AI — Production Readiness Checklist

## Purpose

This document tracks the engineering controls required to prepare OrganHeal AI
for reliable production use, growth, security, performance, and future
scalability.

Production readiness is evidence-based. A capability is marked verified only
when implementation or production behavior has been checked directly.

---

## Current Status

**Phase:** Production Readiness
**Gate:** Gate 2 — In Progress

Major production-readiness infrastructure is implemented. Remaining work
is focused on broader performance validation, hosted telemetry validation,
and final release-gate review.

---

## Verified Areas

- Query and performance discipline
- Production database indexing
- Durable background jobs and recovery
- API authentication and authorization hardening
- Private lab-report storage and upload restrictions
- WhatsApp webhook signature verification and request tracing
- Structured logging and request IDs
- Health and queue monitoring endpoint
- Automated regression testing
- Production dependency security audit
- Baseline load testing

---

## Automated Testing

Latest verified test run:

- Test files: 73 passed
- Tests: 454 passed
- Failed tests: 0
- Duration: 7.82 seconds

Standard verification:

```text
npx tsc --noEmit
npm test
npm run build
git diff --check
```

---

## Load and Performance Testing

Reusable load test:

`npm run test:load:health`

Current automated guardrails:

- Connections: 10
- Duration: 15 seconds
- Pipelining: 1
- Average latency maximum: 1500 ms
- p97.5 latency maximum: 4000 ms
- Errors: 0 required
- Timeouts: 0 required
- Non-2xx responses: 0 required

Verified successful runs included:

| Requests | Average latency | p97.5 | Errors | Timeouts | Non-2xx |
|---:|---:|---:|---:|---:|---:|
| 148 | 973.82 ms | 3009 ms | 0 | 0 | 0 |
| 157 | 925.00 ms | 2789 ms | 0 | 0 | 0 |
| 146 | 966.32 ms | 3082 ms | 0 | 0 | 0 |

Intermittent non-2xx responses were observed during some load-test runs.

Enhanced `/api/health` diagnostics identified the dependency failure as:

- Supabase/PostgREST error code: `PGRST303`
- Error message: `JWT issued at future`

The condition remained reproducible after upgrading `@supabase/supabase-js`
from 2.107.0 to 2.112.3.

Local Windows time synchronization was verified against `time.windows.com`.
Five measurements showed an average clock offset of approximately -0.153
seconds, so no material local clock drift was demonstrated by that check.

The backend admin client uses a Supabase `sb_secret_` server key rather than
a legacy three-part JWT key.

The root cause has not yet been confirmed. The condition is tracked as an
unresolved Supabase/PostgREST dependency risk. The load-test guardrail
continues to require zero non-2xx responses and has not been weakened to hide
the failure.

These tests do not establish the maximum number of users OrganHeal can
support. They cover one local production-build endpoint connected to
external dependencies.

---

## Security Verification

- Production dependency audit: 0 vulnerabilities
- Row-level access controls reviewed
- Application-role TRUNCATE and TRIGGER privileges removed from existing
  public tables
- Lab-report bucket remains private
- Lab-report uploads restricted to PDF, PNG, and JPEG
- Lab-report upload limit: 20 MB per file
- User storage paths isolated by authenticated user ID
- WhatsApp webhook verification token and HMAC signature validation enabled
- Request tracing enabled on the WhatsApp webhook

---

## Database Index Verification

Production inspection confirmed required access patterns are indexed.

`profiles(id)` is covered by `profiles_pkey`.

`generated_intelligence_results(user_id, insight_id)` is covered by
`generated_intelligence_results_unique_insight`.

Duplicate indexes for these two access patterns are therefore unnecessary.

---

## Gate 2 — Remaining Verification

- Expand performance testing beyond `/api/health`
- Validate representative authenticated user journeys
- Validate background-job throughput under controlled load
- Continue investigating health-check tail latency
- Confirm hosted production telemetry and alerting strategy
- Perform final production security review
- Update the project scorecard
- Complete final release-gate review

---

## Production Readiness Definition

OrganHeal should be considered ready for broader production growth only when
the evidence supports stable architecture, secure medical-data handling,
reliable background processing, production observability, automated testing,
representative load testing, reliable health-intelligence workflows, and no
unresolved launch-blocking security findings.

---

## Review Frequency

Update this document after every major production-readiness milestone,
architectural change, security review, or meaningful performance test.
