# OrganHeal Project Scorecard

> Version: 2.0
>
> Status: Active
>
> Purpose: Provide an evidence-based high-level view of OrganHeal maturity,
> engineering health, remaining risks, and release priorities.

---

# Overall Project Vision

OrganHeal is evolving into a Personal Health Intelligence Platform combining
clinical value, AI, engineering quality, security, reliability, and scalability.

The scorecard guides engineering priorities. Scores represent current maturity
and verified implementation, not guaranteed production capacity.

---

# Current Health Score

| Area | Current | Target | Status |
|---|---:|---:|---|
| Product Vision | 9.5 | 10 | Strong |
| UI / UX | 9.3 | 10 | Strong |
| Architecture | 8.8 | 10 | Strong |
| Documentation | 8.7 | 10 | Strong |
| Performance | 8.0 | 9.5 | Improving |
| Database Design | 8.8 | 9.5 | Strong |
| Security | 8.7 | 9.5 | Strong |
| AI Intelligence | 6.8 | 10 | Developing |
| Background Processing | 8.5 | 10 | Strong |
| Monitoring & Logging | 6.5 | 10 | In Progress |
| Automated Testing | 8.5 | 10 | Strong |
| Load Testing | 5.5 | 10 | In Progress |
| Production Readiness | 8.2 | 10 | In Progress |

---

# Current Phase

**Production Readiness — Gate 2**

Status: **In Progress**

Major infrastructure work has been completed. Remaining work focuses on
representative workload validation, hosted telemetry and alerting, performance
optimization, and final production release review.

---

# Verified Engineering Progress

## Database

- Production indexes reviewed against the live database
- User-scoped access patterns indexed
- Existing primary and unique indexes identified to avoid duplication
- Query limits and selected-column discipline established

## Background Processing

- Durable background-job infrastructure
- Job claiming
- Retry handling
- Stale-job recovery
- Idempotency controls
- PDF extraction background processing
- Follow-up delivery infrastructure
- Queue health diagnostics

## Security

- API authentication and authorization hardening
- Private medical-report storage
- User-folder storage isolation
- Restricted upload MIME types
- Report upload size limit
- Application-role privilege hardening
- WhatsApp webhook verification
- WhatsApp HMAC signature verification
- Request tracing
- Sensitive webhook payload logging avoided
- Production dependency audit reached zero reported vulnerabilities

## Observability

- Structured API logging
- Request IDs
- API timing and performance classification
- Database health checks
- Background queue health checks
- Waiting-job diagnostics
- Stale-running-job diagnostics
- API error-tracker abstraction
- Automated observability tests

External hosted error tracking and alerting are not yet verified as active.
The current error-tracker architecture supports registration of an external
provider but defaults to a no-op tracker when none is configured.

## Automated Testing

Latest verified run:

- 73 test files passed
- 454 tests passed
- 0 failed tests
- Duration: 7.82 seconds

## Load Testing

- Autocannon added as the load-test tool
- Reusable `/api/health` load-test script implemented
- 10 concurrent connections tested
- Repeated successful runs produced zero errors, zero timeouts, and zero
  non-2xx responses
- Average latency remained below the current 1500 ms guardrail
- p97.5 latency remained below the current 4000 ms guardrail

Intermittent non-2xx responses were observed during some repeated load-test
runs. Enhanced health diagnostics identified `PGRST303: JWT issued at future`
from Supabase/PostgREST.

Local Windows time synchronization was verified, and the condition remained
reproducible after upgrading `@supabase/supabase-js` from 2.107.0 to 2.112.3.

The root cause has not yet been confirmed. This remains an unresolved external
dependency risk. The load-test script intentionally continues to fail on any
non-2xx response rather than relaxing the guardrail.

Current load testing is a baseline only and does not establish maximum user
capacity.

---

# Current Strengths

- Clear product architecture
- Strong UI consistency
- Modular service and runtime direction
- Durable background-processing foundation
- Production database indexing
- Stronger medical-data access controls
- Automated regression-test coverage
- Structured API observability
- Repeatable load-test baseline
- Production documentation discipline

---

# Remaining Engineering Risks

- Load testing currently covers only a limited endpoint baseline
- Authenticated end-to-end workloads still require performance testing
- Background-job throughput requires controlled load validation
- Health-check tail latency remains higher than desired
- External hosted error tracking is not yet verified as active
- Production alerting and telemetry require final implementation/validation
- Final production security review remains required
- Full launch readiness has not yet been demonstrated under representative load

---

# Highest Priorities

1. Expand representative performance testing
2. Validate background-job throughput
3. Complete hosted telemetry and alerting
4. Investigate and reduce tail latency
5. Complete final production security review
6. Perform final Gate 2 release review
7. Continue Health Intelligence maturation
8. Prepare Gate 3 and launch-readiness validation

---

# Release Gates

## Gate 1 — Foundation

Status: **Passed**

---

## Gate 2 — Production Readiness

Status: **In Progress**

Completed or substantially implemented:

- Database optimization and index verification
- Durable background jobs
- API observability foundation
- Security hardening
- Automated testing
- Initial repeatable load testing

Remaining:

- Representative authenticated-flow performance testing
- Background-job throughput testing
- Hosted telemetry and alerting validation
- Tail-latency investigation
- Final production security review
- Final Gate 2 release review

---

## Gate 3 — Intelligence Maturation

Status: **Not Yet Opened as the Primary Phase**

Existing intelligence capabilities remain in place, but Gate 3 should begin
only after Gate 2 release criteria are satisfied.

---

## Gate 4 — Launch

Status: **Not Started**

---

# Production Readiness Success Definition

Gate 2 should close only when OrganHeal has evidence supporting:

- Stable architecture
- Secure medical-data handling
- Reviewed and bounded database access
- Reliable background processing
- Production observability and actionable alerting
- Automated regression testing
- Representative performance and load testing
- Operational recovery behavior
- No unresolved launch-blocking security findings

No maximum-user-capacity claim should be made until representative production
load and end-to-end workflows have been measured.

---

# Review Frequency

Update this scorecard after every major architectural, security, reliability,
or performance milestone.
