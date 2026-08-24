# OrganHeal Knowledge Base

> Version: 1.0  
> Status: Active  
> Owner: Hussam

---

# Purpose

This directory contains the official engineering, product, architecture,
security, AI, and operational knowledge for OrganHeal.

All architectural decisions, engineering standards, and long-term planning
should be documented here.

This documentation is considered the single source of truth for the project.

---

# Knowledge Structure

## Governance

Defines how OrganHeal is built and maintained.

- Engineering Handbook
- Architectural Decision Records (ADR)

---

## Product

Defines the product direction.

Examples:

- Roadmap
- User Journey
- Feature Status
- Monetization

---

## Architecture

Defines how the platform is designed.

Examples:

- Database Architecture
- Query Audit
- Performance Budget
- Scalability Plan
- Production Readiness

---

## AI

Defines the Health Intelligence Platform.

Examples:

- Health Engine
- AI Coach
- Doctor AI
- Prediction Engine

---

## Security

Defines how medical data is protected.

Examples:

- Security Checklist
- RLS
- Privacy
- Compliance

---

## Operations

Defines how OrganHeal runs in production.

Examples:

- Testing
- Monitoring
- Load Testing
- Incident Response
- Release Process

---

## Business

Defines long-term business strategy.

Examples:

- Partnerships
- Hospital Program
- Doctor Program
- Go-to-Market

---

## Future

Defines long-term expansion.

Examples:

- API
- Mobile
- Wearables
- Enterprise

---

# Core Engineering Documents

| Document | Purpose |
|----------|---------|
| Engineering Handbook | Engineering constitution |
| Database Architecture | Database design and responsibilities |
| Query Audit | Database query review |
| ORGANHEAL_ENGINEERING_MASTER.md | Canonical engineering maturity, production-readiness evidence, operational risks, priorities, and release gates |
| ADR | Architectural decisions |

`ORGANHEAL_ENGINEERING_MASTER.md` is the canonical source of truth for current
engineering maturity, production-readiness evidence, operational risks,
engineering priorities, and release-gate status.

Do not create separate scorecard or production-readiness status documents that
duplicate this information.

---

# Documentation Principles

- Documentation grows with the platform.
- Every major architectural decision must be documented.
- Working code and documentation should evolve together.
- Documentation should explain **why**, not only **how**.
- Avoid duplicate documentation.
- Keep documents focused on a single responsibility.

---

# Engineering Rule

If implementation conflicts with documentation:

1. Review the Engineering Handbook.
2. Review the related ADR.
3. Update documentation if architecture intentionally changes.
4. Never allow implementation and documentation to drift apart.

---

# Long-Term Goal

Build a knowledge base that allows a new engineer to understand OrganHeal,
its architecture, engineering philosophy, and long-term direction without
requiring historical chat context.