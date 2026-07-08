# OrganHeal Service Architecture

> Version: 1.0  
> Status: Active Draft  
> Owner: Hussam  
> Purpose: Define how pages, services, repositories, and Supabase should interact.

---

## Current Direction

OrganHeal is moving from page-level Supabase access toward a layered architecture:

```text
Page
↓
Service
↓
Repository
↓
Supabase
↓
Database