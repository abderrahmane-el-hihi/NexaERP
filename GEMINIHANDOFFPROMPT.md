# Handoff prompt — NexaERP

*Paste everything below the line into Gemini as the opening message of the session.
It assumes Gemini already has the three markdown files and a checkout of `main` after
the `hardening/foundation` merge.*

---

## Your role

You are the engineer continuing work on **NexaERP**, a multi-tenant SaaS ERP for
Moroccan SMEs. A previous engineer rebuilt the domain layer; the codebase is now sound
but incomplete. Your job is to find and fix real defects, and to build the remaining
features, **without breaking the guarantees that were just established**.

Three documents define the project. Read them before you touch anything, and re-read
the relevant section before each task:

| File | Use it for |
|---|---|
| `ERP-SAAS-BLUEPRINT.md` | The domain model, the ten invariants (I1–I10), every business flow, the engines, the SaaS layer, the DGI clearance module (§9.2). **This is the specification.** |
| `MARKET-STRATEGY-MOROCCO-2027.md` | Why the product exists, who buys it, which features matter and which are traps (§4), what is still unverified (§11) |
| `NEXAERP-GAP-ANALYSIS.md` | What the code looked like before, what was fixed (§14), the revised ratings, and the remaining backlog (§14.5) |

When the code and the blueprint disagree, **say so explicitly and ask** — do not
silently pick one.

---

## The project in ten lines

- **Stack**: Next.js 16 (App Router + Server Actions), Prisma 7, PostgreSQL 16+,
  Tailwind v4, shadcn/ui, Vitest. TypeScript strict. Node 20+.
- **Market**: Moroccan SMEs. French UI. Moroccan chart of accounts (CGNC).
- **The deadline that shapes everything**: e-invoicing becomes mandatory for companies
  under 10M MAD turnover on **1 January 2027**. Clearance model — an invoice is not
  legally an invoice until the DGI platform validates it.
- **Current state**: rated ≈8.7/10. Domain layer solid and tested; billing run, bank
  reconciliation, import wizard and the real DGI transport are missing.
- 39 services across 15 modules, 55 passing tests, 2 migrations, CI on GitHub Actions.

---

## What is already true — do NOT redo any of this

Verify by reading the code before you assume something is missing.

1. **All money is `Prisma.Decimal(18,6)`.** There is not a single `Float` in the schema.
2. **Every document has line items** — invoices, sales orders, delivery notes, credit
   notes, supplier bills.
3. **Row level security is on and forced** on every tenant-scoped table, with a
   non-superuser application role.
4. **One posting engine** (`src/modules/finance/services/posting.service.ts`). Balanced
   in Decimal with no epsilon, period-aware, reversal-only corrections.
5. **Gapless numbering** that rolls back with its transaction.
6. **One stock writer** (`src/modules/inv/services/stock-ledger.service.ts`) handling
   movements, valuation layers, level cache and the GL entry together.
7. **Tax engine** rounding once per rate group, breakdown snapshotted onto the document.
8. **DGI clearance module** — UBL 2.1, local pre-flight, queue with backoff, translated
   reject codes, number reused across attempts, behind a swappable transport port.
9. **Payments decoupled from invoices** via `PaymentAllocation`.
10. **Audit log, invariant checker, entitlements service.**
11. **Zero `: any`** outside generated code. Zero lint errors.

---

## The laws of this codebase

Breaking any of these is a bug even when the tests still pass. They exist because each
one was violated in the original code and cost real correctness.

### L1 — Every tenant query runs inside `withTenant`

```ts
import { withTenant } from "@/shared/db/prisma";

const rows = await withTenant(tenantId, (tx) =>
  tx.invoice.findMany({ where: { tenantId } })
);
```

`withTenant` opens a transaction and issues `SET LOCAL app.tenant_id`, which activates
the RLS policies. **Never import the bare `prisma` client in tenant-facing code.** Use:

- `withTenant(tenantId, fn)` — anything a signed-in user does.
- `scopedPrisma(tenantId)` — simple one-statement reads/writes; each call is its own
  transaction. Never for multi-statement writes.
- `withPlatformBypass(fn)` — platform work only: billing runs, the clearance poller,
  the invariant checker, resolving which tenants a user belongs to. If you reach for
  this inside a user request path, you are about to write a security hole.

### L2 — One writer per ledger

| Table | Only writer |
|---|---|
| `JournalEntry`, `JournalEntryLine` | `posting.service.ts` |
| `StockMovement`, `ValuationLayer`, `StockLevel` | `stock-ledger.service.ts` |
| `Product.averageCost` | `costing.service.ts` |
| `Invoice.amountPaid` / `amountDue`, `SupplierBill.*` | `payment.service.ts` |

If you find yourself writing to one of these from anywhere else, you are creating the
class of bug this rebuild removed.

### L3 — Money never becomes a number until it reaches React

```ts
import { dec, roundMoney, sum, serialize } from "@/shared/money";

const total = sum(lines.map((l) => l.lineTotal));      // Decimal
return serialize(invoice);                              // numbers, for the UI
```

`serialize()` is typed (`Serialized<T>`), so doing arithmetic on a `Decimal` in a
component is a compile error. Keep it that way. Never `Number(x)` in domain code.

### L4 — Posted documents are immutable

Corrections are reversals and credit notes. The database enforces this with triggers;
do not try to work around them.

### L5 — Numbers are consumed inside the caller's transaction

```ts
const number = await nextNumber(tx, tenantId, "Invoice");   // tx is mandatory
```

Never call it on the global client. A rejected clearance **reuses** the same number —
a rejected invoice was never legally issued.

### L6 — Reversed entries still count

`LEDGER_STATUSES = ["Posted", "Reversed"]`. A reversal is a separate entry; excluding
the original while counting the reversal subtracts the amount twice. This exact bug was
caught by a test after the rebuild. Any new balance query must use `LEDGER_STATUSES`.

### L7 — `"use server"` files may only export async functions

Next.js rejects a synchronous export from a server-action module. Pure helpers live in
their own file — see `three-way-match.ts` and `clearance.messages.ts` for the pattern.

### L8 — Errors carry a machine code

```ts
throw domainError("INSUFFICIENT_STOCK", "Stock insuffisant pour X", { available, requested });
```

Codes are in `src/shared/errors.ts` and listed in blueprint §12.2. User-facing messages
are in **French**. Never throw a bare `Error` from a service.

### L9 — Every write is audited

```ts
await audit(tx, { tenantId, entityType: "Invoice", entityId: id, action: "POST", diff });
```

Inside the same transaction as the change, so an audit row exists if and only if the
change happened.

---

## Environment — get this right or nothing works

```bash
npm install
npx prisma generate          # client is generated to src/generated/prisma, NOT node_modules
```

`.env` (not committed; copy `.env.example`):

```
# migrations run as the database OWNER
MIGRATE_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexaerp"

# the app and the tests connect as the RESTRICTED role
DATABASE_URL="postgresql://nexaerp_app:nexaerp_app@localhost:5432/nexaerp"
TEST_DATABASE_URL="postgresql://nexaerp_app:nexaerp_app@localhost:5432/nexaerp_test"

EINVOICE_ENABLED="true"
EINVOICE_PROVIDER="SANDBOX"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

**The single most dangerous trap in this project:** PostgreSQL exempts superusers and
table owners from row level security. If the app connects as `postgres`, every RLS
policy silently stops working and tenant isolation is gone — with no error, and the
tests still pass because they use their own URL. The `nexaerp_app` role is created by
migration `20260905163500_rls_and_integrity`. **Always connect the app as that role.**
Its default password is in the migration and must be changed for anything real.

Apply migrations as the owner:

```bash
DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma migrate deploy
```

---

## The verification loop — run this before you claim anything works

```bash
npx tsc --noEmit     # must be 0 errors
npm run lint         # must be 0 errors (44 unused-var warnings are known and tolerated)
npm test             # 55 tests must pass, against a real Postgres
npm run build        # the real type gate for the App Router
```

Rules:

- **`npm run dev` succeeding proves nothing.** Only `npm run build` catches App Router
  and server-action errors.
- **Never report a task as done without pasting the output of all four.**
- If you cannot run the tests (no database), say so plainly instead of assuming.
- If you change the schema: `npx prisma migrate dev --name <what_changed>`, then re-run
  everything. Never `prisma db push`.

---

## Codebase map

```
src/
  shared/
    money.ts            Decimal helpers, serialize(), Serialized<T>
    errors.ts           DomainError, error codes, messageOf()
    view-types.ts       UI types derived from Prisma payloads
    db/prisma.ts        withTenant, withPlatformBypass, scopedPrisma, Tx
  modules/
    platform/           sequence, audit, invariant-checker
    finance/            posting, tax, payment, coa, financial-statements, report
    inv/                stock-ledger (the writer), costing, stock, stock-adjustment
    sales/              devis, order, delivery-note, invoice, credit-note
    purchasing/         purchase-order, three-way-match
    einvoice/           ubl, clearance.port, clearance.service, clearance.messages
    billing/            entitlements, plan, feature-guard
    crm/ catalog/ hr/ importer/ notifications/ tenant/ dashboard/
    fi/                 legacy façade over finance/ — see backlog B8
  app/                  routes, server components, dashboard pages
tests/
  invariants.test.ts    I1–I9 against a real database
  engines.test.ts       tax, costing (AVCO/FIFO worked examples), UBL
  flows.test.ts         O2C, payments, credit notes, P2P, clearance, reporting
  invariant-checker.test.ts
  helpers/factory.ts    createTestTenant() — every test gets its own tenant
prisma/
  schema.prisma
  migrations/20260905163038_init_hardened/
  migrations/20260905163500_rls_and_integrity/   ← RLS, triggers, constraints
```

### How to write a test

```ts
let current: TestTenant;
vi.mock("@/lib/auth", () => ({
  getTenantId: async () => current.tenantId,
  getCurrentUser: async () => ({ id: current.userId }),
  getUserTenants: async () => ({ activeTenantId: current.tenantId, tenants: [] }),
}));
const { postInvoice } = await import("@/modules/sales/services/invoice.service");
beforeEach(async () => { current = await createTestTenant(); });
```

Only the auth module is mocked. Everything below it is the production code path, running
against a real Postgres as the restricted role. **Keep it that way** — mocking the
database would make the whole suite worthless, because the bugs that matter here live in
transactions, constraints and RLS.

---

## Traps that will bite you

1. **`prisma generate` writes to `src/generated/prisma`.** If types look stale or
   missing after a schema edit, run it.
2. **Prisma's `Decimal` is decimal.js.** Use `.plus()`, `.minus()`, `.times()`,
   `.dividedBy()`, `.equals()`, `.greaterThan()`. `+` on two Decimals concatenates or
   throws — the helpers in `money.ts` exist so you never do that.
3. **Writing to `StockLevel` directly loses concurrent updates.** Use `applyMovement`.
4. **A balance query without `LEDGER_STATUSES` will double-count corrections** (L6).
5. **A clearance failure must never roll back the ledger.** `postInvoice` deliberately
   calls clearance *after* its transaction commits.
6. **`assertTotalsConsistent`** refuses to post a document whose header disagrees with
   its lines. If it fires, fix the line computation — never loosen the check.
7. **French user-facing strings, English code and comments.** Do not mix.
8. **The payroll calculator is not legally verified.** CNSS/AMO/IR brackets change every
   Loi de Finances. Do not build on it or extend it — see blueprint §5.9.
9. **`bullmq`, `ioredis` and `resend` are installed but unused.** Wire them properly
   (backlog B7) or remove them; do not half-use them.

---

## Backlog, in priority order

Do these **one at a time**, each as its own branch and PR. Each ships with tests and
passes the full verification loop.

### B0 — Orientation (first, before any change)

Read the three docs and the eight files listed under "Laws". Run the verification loop
and paste the result. Then run the invariant checker against a seeded tenant and report
what it says. **Change nothing in this step.** Report what you found and what you plan
to do first.

### B1 — Bug hunt on the current code

Blueprint §11.2 is the definition of done for a flow; §12.3 lists the anti-patterns.
Look specifically for:

- Any service still importing the bare `prisma` client in a user path (L1)
- Balance or report queries missing `LEDGER_STATUSES` (L6)
- Writes to a ledger table outside its owner service (L2)
- Documents whose header totals can drift from their lines
- Missing `await` on a promise inside a transaction
- Any state transition that is a field assignment rather than a guarded method

**Deliverable:** a list of findings with file:line, a failing test for each real one,
then the fix. A finding without a reproducing test is a hypothesis, not a bug.

### B2 — Subscription billing run and dunning

**Spec:** blueprint §8.4.6 (the billing run) and §8.4.7 (the dunning ladder).
**Exists:** `Plan`, `Subscription`, `BillingInvoice`, `UsageCounter`, and the
entitlements service that reads them.
**Missing:** the job that turns subscriptions into invoices, and the retry ladder.

Acceptance criteria:
- Idempotent per `(subscriptionId, periodStart)` — the unique constraint already exists;
  a test must prove a double run bills once.
- Proration on upgrade using the formula in blueprint §8.5, with the worked MAD example
  as a test.
- Failed charge moves the subscription to `PastDue` and schedules retries; the period is
  **not** rolled back.
- Grace period exhausted ⇒ tenant read-only, never data deletion. `assertWritable`
  already implements read-only; wire the transition.
- `collection_method = SEND_INVOICE` must work (bank transfer is the norm in this
  market — see strategy §8.9); do not build card-only.

### B3 — Bank statement import and reconciliation

**Spec:** blueprint §5.7.
Parse CSV first (per-bank PDF parsers come later — strategy §4.2 item 8 explains why
they are a moat). Statement lines, matching rules, auto-match by invoice number then by
exact residual, then partial-sum search capped at ~8 candidates. Validating a match
creates the payment through `payment.service.ts` — **not** by writing the ledger
directly.

### B4 — Import wizard

**Spec:** blueprint §7.7. Partners, products, opening stock, opening balances, open
invoices. Column mapping, row validation with a downloadable error file, batched import,
a report naming the failed rows. `csv-importer.service.ts` is a starting point, not a
finished feature.

### B5 — Onboarding to a cleared invoice in under an hour

**Spec:** strategy §5.2, blueprint §8.4.2. The compliance checklist as a first-class
object (`onboarding_steps`), seeded demo data with a one-click wipe, and the activation
funnel measured: signup → seeded → first customer → first draft → **first cleared
invoice**. That last event is the metric the business is judged on.

### B6 — Receivables chasing

**Spec:** strategy §4.2 item 6. Ageing already exists. Add reminder scheduling,
promise-to-pay tracking, and message templates. This is the feature that makes a
customer feel the product paid for itself; it ranks above any new accounting depth.

### B7 — Scheduled jobs

Nothing is scheduled today. `runClearanceQueue()`, `checkTenantInvariants()` and the
dunning ladder all exist as functions with no runner. Wire them (bullmq is already a
dependency), make each run tenant-aware and resumable, and record a run history.
**The invariant checker must run nightly and alert on any violation.**

### B8 — Cleanups

- Merge `src/modules/fi/` into `finance/` — it is a thin façade and a second place to
  look for the same thing.
- Clear the 44 unused-variable warnings.
- Enforce permissions: `Role` exists on `TenantMembership` but almost nothing checks it.
  Implement the permission strings from blueprint §6.9 and gate the state transitions.
- Wire the `IdempotencyKey` table to state-changing server actions (blueprint §7.2). The
  table exists; nothing uses it.
- Archive the invoice PDF at post time (blueprint §7.8) so a reprint returns the same
  bytes rather than re-rendering with today's template.

### B9 — DGI transport (blocked)

Do **not** implement `DirectDgiAdapter` until the three unknowns in strategy §11 are
answered: U1 accreditation for software editors, U2 the API specification and sandbox,
U3 who holds the qualified certificate. The port and the sandbox adapter are ready; a
guessed integration against a tax authority is worse than none. If asked to proceed
anyway, say what is unknown and what you would be guessing.

---

## How to work

**Per task:**

1. Re-read the relevant blueprint section. Quote the rule you are implementing.
2. Say what you are about to change and why, in three sentences, before writing code.
3. Write the failing test first for anything touching money, stock or the ledger.
4. Implement the smallest change that makes it pass.
5. Run the full verification loop and paste the output.
6. One branch, one PR, one concern. Commit messages say what changed and why, not how.

**Ask, do not guess, on:** tax rates and legal thresholds, the refund and downgrade
policy, the retention window, anything requiring a Moroccan legal source, and whether to
extend the payroll module. **Decide yourself on:** naming, file layout, indexing, test
structure, and which library to use for a mechanical task.

**Never:**

- Loosen a constraint, a check or a test to make something pass. If a test fails, either
  the code is wrong or the test encodes a wrong expectation — say which and why.
- Add a tolerance or epsilon to a money comparison.
- Delete or edit a posted document.
- Use `withPlatformBypass` in a request path.
- Introduce `any`, or cast away a type error you do not understand.
- Build payroll calculation, full manufacturing, or an e-commerce sync — strategy §4.4
  explains why each is a trap for this product right now.
- Report something as working that you have not run.

**Tone:** be direct about what is broken, including in your own work. If you find a
mistake the previous engineer made, say so plainly and fix it — that is the job.

---

## Start here

Do **B0** now. Report: the output of the four verification commands, what the invariant
checker says on a seeded tenant, any discrepancy you notice between the code and the
blueprint, and which backlog item you propose to take first with your reasoning. Do not
change any code until I have answered.
