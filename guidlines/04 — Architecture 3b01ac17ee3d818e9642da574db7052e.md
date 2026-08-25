# 04 — Architecture

## 1. High-level shape: modular monolith

One Next.js application: UI Layer (App Router, React Server Components) → Server Layer (Server Actions/Route Handlers) → Service Layer (modules: crm/sales/inventory/purchasing/invoicing/accounting/auth/tenant) → tenant-scoped Prisma Client → PostgreSQL (RLS enabled), Redis (BullMQ jobs), S3-compatible storage.

A separate lightweight **worker process** (same repo, different entrypoint) handles background jobs: reminders, recurring invoices, PDF generation, and later async DGI submission with retry.

**Key idea:** one codebase, one deployable web app + one worker. No microservices, no service mesh, no message broker beyond Redis/BullMQ.

## 2. Module boundaries

Organize by business module, not technical layer:

```
/src/modules: auth, tenant, crm, catalog, sales, purchasing, inventory, invoicing, accounting, compliance (phase 2), notifications, dashboard
/src/shared: db (Prisma client + tenant-scoping + RLS helpers), ui, lib (zod schemas, formatting, utils), jobs (BullMQ queues, worker bootstrap)
```

Each module exposes a small, explicit **service API** (plain TS functions, e.g. createDevis(), convertDevisToCommande()). Modules must not import another module's Prisma models directly — they call the other module's service functions. This is what keeps the monolith modular and makes future extraction possible.

## 3. Multi-tenancy model

- Isolation: shared database, shared schema, tenant_id column on every tenant-owned table.
- Two-layer enforcement:
    1. Application layer: a wrapped Prisma client auto-injects WHERE tenant_id = currentTenant from the authenticated session — never trust a client-supplied tenant_id.
    2. Database layer (defense in depth): Postgres Row-Level Security policies keyed off a session variable (app.current_tenant_id), set per request/transaction.
- Tenant resolution: subdomain-based (preferred) or a "select your company" screen post-login as an MVP shortcut.
- No cross-tenant data in MVP except a small set of global/reference tables (Moroccan cities, standard TVA rates).

## 4. Security & access control

- Roles per tenant: Owner/Admin (full + billing), Sales (CRM + sales docs, no accounting), Accountant (invoicing + accounting + reports, read-only elsewhere), Viewer (read-only dashboards).
- Authorization lives in the service layer (not just UI) — every service function validates the caller's role.
- Audit trail: append-only history on every commercial document (who created/edited/converted/cancelled, when) — both a trust and compliance requirement.
- Secrets: environment variables, never committed.

## 5. The escape hatch

If Nexa-ERP ever needs to scale past a monolith (many tenants, heavy background processing, or a growing team), the natural split is extracting the service layer into a standalone API (e.g. NestJS, same Prisma schema) behind the existing Next.js frontend — without rewriting business logic. **Do not build this split preemptively.**

## 6. Key non-functional requirements

- Data integrity over raw performance — every money/stock operation runs inside a Postgres transaction.
- Idempotency on document-conversion actions (Devis→Commande, Commande→BL, BL→Facture) — converting twice must never duplicate documents or double-move stock.
- Legal invoice numbering: sequential and gapless per tenant per fiscal year, generated inside the same transaction as invoice creation.
- Immutability after validation: a finalized (and later DGI-cleared) facture's core fields are read-only; corrections happen via a credit note (avoir), never an edit.
- Bilingual from the data model, not just the UI — support French/Arabic (RTL) without a later schema change.