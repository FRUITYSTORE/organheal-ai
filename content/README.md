# OrganHeal Medical Content

This directory contains the independent medical knowledge base used by the
OrganHeal Knowledge Layer.

## Core rules

1. Medical claims must include at least one reliable source.
2. Content must remain in draft status until medically reviewed.
3. English and Arabic versions use separate files and IDs.
4. Every item must follow `schemas/knowledge-item.schema.json`.
5. Articles, videos, research updates, guides, and quick-learning content must
   remain independent from application source code.
6. Expired or archived content must not be recommended to users.
7. Educational content must not present itself as diagnosis or individualized
   medical treatment.

## Directory structure

- `knowledge-packs/`: organized knowledge collections for each organ.
- `articles/`: full educational articles.
- `videos/`: video metadata and transcripts.
- `research-updates/`: simplified summaries of current research.
- `health-minutes/`: short practical learning cards.
- `daily-facts/`: brief evidence-based facts.
- `family-guides/`: content for children, parents, caregivers, and older adults.
- `myths-vs-facts/`: evidence-based misconception correction.
- `faqs/`: frequently asked health questions.
- `doctor-resources/`: clinician-facing educational references.
- `checklists/`: practical patient and doctor checklists.
- `schemas/`: validation standards for content files.