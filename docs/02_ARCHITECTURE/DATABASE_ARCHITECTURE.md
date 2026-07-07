# OrganHeal Database Architecture

> Version: 1.0  
> Status: Active Draft  
> Owner: Hussam  
> Purpose: Define the current and future database structure that supports OrganHeal as a scalable Personal Health Intelligence Platform.

---

## 1. Database Role

The database is not only a storage layer.

It is the long-term health memory of OrganHeal.

It stores:

- User identity metadata.
- Organ assessments.
- Daily check-ins.
- Uploaded medical files.
- Extracted report content.
- AI-generated health insights.
- Generated intelligence results.
- Health history events.
- Doctor-facing summaries.
- Future health timeline and prediction records.

The database must support three goals:

1. Fast user experience.
2. Safe private health data access.
3. Long-term health intelligence generation.

---

## 2. Confirmed Core Tables

The following tables are currently confirmed in the codebase:

| Table | Current Role |
|---|---|
| `profiles` | User profile metadata |
| `organ_assessments` | Organ assessment scores and risk levels |
| `daily_checkins` | Daily wellness updates |
| `uploaded_lab_files` | Uploaded medical reports and extracted text |
| `health_insights` | Report-level AI insights |
| `generated_intelligence_results` | Saved generated intelligence output |
| `health_history` | Timeline/history events |

---

## 3. Current Data Flow

```text
User
↓
Profile
↓
Assessments / Check-Ins / Uploaded Reports
↓
Report Extraction
↓
Health Insights
↓
Generated Intelligence Results
↓
Dashboard / Reports / Health Plan / Doctor Portal