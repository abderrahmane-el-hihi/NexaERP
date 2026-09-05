# NexaERP

A multi-tenant ERP for Moroccan SMEs, built around accounting integrity: every document
that means something financially produces a balanced, immutable ledger entry, and the
database enforces that independently of the application code.

## Tech stack

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Database**: PostgreSQL 16+ with row level security
- **ORM**: Prisma 7 (`Decimal` for all money — never `Float`)
- **UI**: Tailwind CSS v4, shadcn/ui, Heroicons, dark mode
- **Tests**: Vitest against a real Postgres

## What is implemented

| Area | State |
|---|---|
| Multi-tenancy | `tenantId` on every row, Postgres RLS policies, a restricted application role, and cross-tenant tests |
| General ledger | Single posting engine; balanced entries enforced by the service *and* a deferred database trigger; posted entries immutable; corrections are reversals |
| Accounting calendar | Monthly periods with Open / SoftClosed / Closed; posting into a closed period is refused |
| Numbering | Gapless per (tenant, type, year), consumed inside the caller's transaction so a failed save leaves no hole |
| Sales | Quotation, order, delivery note, invoice with line items, credit notes (full and partial) |
| Purchasing | Purchase order, goods receipt, supplier bill with three-way match, supplier payment |
| Inventory | Append-only movement ledger, valuation layers, AVCO and FIFO costing, derived level cache that can be rebuilt |
| Payments | Decoupled from invoices: one payment can settle several documents; bounced cheques reverse cleanly |
| Taxes | Dated VAT rates, per-line computation, rounding once per rate group, breakdown snapshotted onto the document |
| E-invoicing (DGI) | UBL 2.1 generation, local pre-flight validation, clearance state machine with queue, backoff and translated reject codes, behind a swappable transport adapter |
| Reports | Trial balance, CPC, bilan, aged receivable and payable (by due date), partner ledger, VAT return figures |
| SaaS layer | Plans, subscriptions, entitlements (features, limits, read-only suspension), usage counters |
| Platform | Audit log, invariant checker, idempotency keys, error codes |

### Deliberately not built

- **Payroll calculation** is present but must not be trusted as a source of legal truth:
  CNSS, AMO and IR rules change annually. Import the journal entry from the payroll
  provider instead.
- **Direct DGI transport** is stubbed. The adapter interface is in place; the endpoint,
  the credentials and whether software editors need accreditation are unresolved
  regulatory questions. See `src/modules/einvoice/services/clearance.port.ts`.
- **Warehouse locations** are modelled as a flat warehouse plus typed movements rather
  than a location tree. Correct for SME scope; revisit if lots, serials or multi-step
  picking are needed.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local install or Docker)

### Setup

```bash
npm install
cp .env.example .env    # then edit DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The RLS migration creates a restricted role `nexaerp_app`. **The application must
connect as that role, not as the database owner**: superusers and table owners bypass
row level security, so connecting as the owner silently disables tenant isolation.

```
# migrations (owner)
DATABASE_URL=postgresql://postgres@localhost:5432/nexaerp

# application and tests (restricted)
DATABASE_URL=postgresql://nexaerp_app:nexaerp_app@localhost:5432/nexaerp
```

### Tests

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest, against TEST_DATABASE_URL
npm run build       # the real type gate for the app router
```

The suite runs against a real database and covers the invariants, the engines and the
end-to-end flows. It is the reason the rest of this README can be believed.

## Architecture

```
src/
  shared/            money (Decimal helpers), errors, db (tenant-scoped clients)
  modules/
    platform/        sequences, audit log, invariant checker
    finance/         posting engine, tax engine, payments, reports, chart of accounts
    inv/             stock ledger, costing
    sales/           quotations, orders, deliveries, invoices, credit notes
    purchasing/      purchase orders, receipts, bills, three-way match
    einvoice/        UBL generation, clearance port and adapters
    billing/         plans, subscriptions, entitlements
    crm/ catalog/ hr/ importer/ notifications/ tenant/
  app/               routes and server components
tests/               invariants, engines, flows, invariant checker
```

Rules that keep it honest:

1. **One writer per ledger.** `StockMovement`, `ValuationLayer` and `JournalEntryLine`
   are written by the stock ledger, the costing service and the posting service
   respectively — nowhere else.
2. **Money is `Decimal` end to end**, converted to `number` only at the React boundary
   via `serialize()`, which is typed so a component cannot do arithmetic on a `Decimal`
   by accident.
3. **Every tenant query runs inside `withTenant`**, which sets the Postgres tenant
   context. A query that forgets its `where` clause returns nothing instead of another
   company's data.
4. **Posted documents are immutable.** Corrections are reversals and credit notes.

## Licence

Proprietary — all rights reserved.
