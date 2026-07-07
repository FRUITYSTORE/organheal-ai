# OrganHeal Engineering Constitution

> Version: 1.0  
> Status: Active  
> Owner: Hussam  
> Purpose: Define how OrganHeal is built, evaluated, protected, scaled, and improved.

---

## 1. Why OrganHeal Exists

OrganHeal exists to transform fragmented health information into understandable, trustworthy, and actionable health intelligence.

People do not need more disconnected medical data. They need clarity, direction, and a safe way to understand what matters most.

OrganHeal is being built as a Personal Health Intelligence Operating System that helps users understand their health, recognize early risks, prepare for doctor visits, and follow a realistic long-term health plan.

---

## 2. What OrganHeal Will Never Become

OrganHeal will not become:

- A simple PDF storage app.
- A generic medical chatbot without user context.
- A page collection with disconnected features.
- A tool that overwhelms users with medical data.
- A replacement for licensed medical care.
- A product that sacrifices trust, speed, or safety for visual complexity.

---

## 3. The Five Pillars

Every feature must improve at least one pillar:

1. Clinical Value
2. User Value
3. Performance & Reliability
4. Scalability
5. Business Sustainability

If a feature improves none of these, it should not be built.

---

## 4. Engineering Mindset

Before writing code, ask:

- What real problem are we solving?
- Who benefits from this?
- Can we reuse existing logic or components?
- Does this add new database queries?
- Does this affect performance?
- Does this require background processing?
- Does it increase technical debt?
- Will it still make sense at 100,000 users?

---

## 5. Product Principles

- Every page must have one primary objective.
- Every page must guide the user to the next best action.
- Confusion is treated as a product bug.
- Clinical clarity is more important than visual complexity.
- Repeated information should be removed or merged.
- The platform should explain, prioritize, and guide.

---

## 6. Engineering Principles

- One scoped change at a time.
- Build after every meaningful change.
- Commit only after a clean build.
- Avoid duplicated components.
- Avoid duplicated logic.
- Refactor before complexity grows.
- Do not add features randomly.
- Do not optimize visually while ignoring performance.

Required check before commit:

```bash
npm run build
git status