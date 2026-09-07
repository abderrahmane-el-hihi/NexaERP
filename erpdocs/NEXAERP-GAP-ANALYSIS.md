# NexaERP — Code Review and Gap Analysis

> **STATUS UPDATE — 5 September 2026.** Everything below §1–§5 describes commit
> `774b85d` (the original MVP) and is kept as the record of where the project started.
> The findings have since been acted on: see **§14 — What was rebuilt** at the end of
> this file for the current state, the new ratings, and what is still open.


> Review of `github.com/abderrahmane-el-hihi/NexaERP` at commit `774b85d` ("Initial commit with
> ERP MVP"), performed 5 September 2026 by static analysis of the cloned repository.
> Measured against [ERP-SAAS-BLUEPRINT.md](./ERP-SAAS-BLUEPRINT.md) and
> [MARKET-STRATEGY-MOROCCO-2027.md](./MARKET-STRATEGY-MOROCCO-2027.md).
>
> **Not verified:** the application was not built or run. No `npm run build`, no runtime, no UI
> inspection. Everything below is from reading the code, the schema and the migrations. Claims
> about behaviour are inferences from source, and are marked where uncertain.

---

## 1. Verdict

**As a first build: genuinely respectable.** The module layout, the use of database transactions,
the append-only stock movement ledger, the invoice immutability guard and the Moroccan PCG posting
codes are all correct instincts that most first attempts get wrong. Somebody was thinking about
the right problems.

**As a product you could sell in 2027: not yet, and the gap is structural rather than cosmetic.**
Two decisions in the data model — money stored as `Float`, and documents with no line items — are
load-bearing mistakes that every later feature makes more expensive to fix. There are no automated
tests to protect a migration, and no database-level tenant isolation.

**The honest summary in one line:** a well-structured V0 skeleton that demos convincingly and
cannot yet be trusted with a real company's accounts.

### Ratings

| Dimension | Score | Reasoning |
|---|---|---|
| Architecture and code organisation | **7/10** | Clean `src/modules/<domain>/services` split, server actions, transactions used in most write paths. Two parallel finance modules (`fi` and `finance`) is the main smell |
| Data model correctness | **3/10** | 55 `Float` money fields, zero `Decimal`; no line items on sales orders, invoices, delivery notes or credit notes; no valuation layers; no reconciliation; zero indexes; no unique constraint on document numbers |
| Accounting integrity | **4/10** | Correct posting shape and correct Moroccan account codes, real immutability guard — but a float-epsilon balance check, no period enforcement, one path that finalises without posting, no partner on ledger lines, no reversal mechanism |
| Inventory | **4/10** | Movement ledger plus derived level cache is the right pattern; broken by a read-then-write race, no cost on movements, no location model |
| Multi-tenancy and security | **5/10** | Tenant cookie is validated against memberships (good, and often done wrong); undone by no RLS, an `any`-typed mass-assignment path, and app-layer-only isolation |
| SaaS / billing layer | **2/10** | A `subscriptionPlan` string plus a static feature map. No subscriptions, prices, invoices, usage, dunning or entitlement limits |
| Morocco compliance | **3/10** | DGI fields exist on the invoice (good awareness), 7-account chart of accounts, no UBL generation, no signature, no clearance client — and no invoice lines, which makes UBL impossible today |
| Testing and quality gates | **2/10** | Zero unit or integration tests in `src`. The root `test-*.mjs` files are Playwright smoke scripts containing an absolute path from a different machine |
| Documentation | **6/10** | Good `guidlines/` set including a Morocco compliance doc; README overstates what is implemented |
| **Overall, as a sellable ERP** | **≈ 4/10** | |
| **Overall, as a first attempt and a foundation** | **≈ 6.5/10** | |

---

## 2. What is genuinely good — keep all of this

1. **Module boundaries.** `src/modules/{sales,purchasing,inv,finance,crm,billing,tenant}/services`
   maps almost exactly onto the blueprint's §7.1 package layout. This is the part most people get
   wrong, and it is right here.
2. **Transactions on write paths.** 16 `$transaction` call sites across the write services. The
   instinct that document + side effects must be atomic is present.
3. **The stock movement ledger.** `StockMovement` is append-only with `sourceDocumentType` /
   `sourceDocumentId`, and `StockLevel` is explicitly documented as a derived cache. That is the
   blueprint's §3.5 model, independently arrived at.
4. **Invoice immutability.** `invoice.service.ts:96` blocks edits to a finalised invoice with an
   allow-list and the error message tells the user to create a credit note. That is invariant I2,
   implemented correctly.
5. **Correct Moroccan postings.** `journal.service.ts` posts Dr 3421 / Cr 7111 / Cr 4455 — exactly
   the blueprint's posting B, with the right PCG codes.
6. **Tenant resolution is safe.** `lib/auth.ts` reads the active tenant from a cookie but
   validates it against the user's actual memberships before use. Many implementations trust the
   cookie; this one does not.
7. **Manual adjustments require a note** (`stock.service.ts:38`) — a real audit control, unprompted.
8. **DGI awareness already in the schema** (`ublXml`, `dgiSubmissionStatus`, `dgiClearanceId`,
   `dgiSubmittedAt`, `dgiClearedAt` on `Invoice`). The problem is known, which is half of it.
9. **Sequences are per tenant, per type, per year** with an atomic increment — the right shape.

---

## 3. Defect register

Severity: **S1** = corrupts data or money, or blocks selling. **S2** = wrong behaviour users will
hit. **S3** = will hurt at scale or in maintenance.

| # | Sev | Defect | Where | Why it matters |
|---|---|---|---|---|
| D1 | S1 | **Money stored as `Float`** — 55 float fields, 0 decimal | `prisma/schema.prisma:212-216` and throughout | `double precision` cannot represent 0.1. Totals, VAT and balances drift. The balance check at `journal.service.ts:77` already had to add a 0.01 epsilon to compensate — which means an entry can be off by a centime and still post. Under DGI clearance, a total that disagrees with the sum of its parts is a rejected invoice |
| D2 | S1 | **No line items on SalesOrder, Invoice, DeliveryNote, CreditNote, SupplierBill** | schema — only `DevisLine`, `PurchaseOrderLine`, `JournalEntryLine` exist | An invoice carries only `subtotal / tvaAmount / total`. You cannot print a legal invoice, cannot break VAT down by rate, cannot generate UBL 2.1, cannot credit part of an invoice, cannot compute margin. This single gap blocks Morocco compliance entirely |
| D3 | S1 | **Sequence is consumed outside the calling transaction** | `sequence.service.ts` uses the global `prisma`; called inside `tx` at `invoice.service.ts:33,65` and `journal.service.ts:28` | If the transaction rolls back, the number is already burned → a gap in the invoice sequence. The DGI platform validates sequential numbering. This is invariant I4, broken |
| D4 | S1 | **An invoice can be Finalized without ever posting to the ledger** | `invoice.service.ts:46` sets `status: "Finalized"` with the comment "let's use Finalized for immutability demo"; only `updateInvoice` posts to the GL | Any invoice created via order conversion exists in the invoice list but not in the general ledger. Revenue and receivables silently disagree. This is exactly the class of bug an ERP cannot have |
| D5 | S1 | **No unique constraint on document numbers** | `grep '@@unique([tenantId, number])'` → 0 hits | Two invoices can carry the same number. Legally fatal, and rejected at clearance |
| D6 | S1 | **No row-level security** | no `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` in any migration | Isolation is 100% application-layer. One forgotten `where: { tenantId }` in one query leaks another company's accounts. Invariant I9 requires defence in the database as well |
| D7 | S1 | **`updateInvoice(invoiceId, data: any)` passes an untyped object to Prisma** | `invoice.service.ts:91` | Mass assignment: a caller can set `total`, `number`, or `tenantId`. The immutability guard only constrains *finalised* invoices; drafts accept anything. The final `update` also omits `tenantId` from its `where` |
| D8 | S2 | **Stock level updated by read-then-write** | `stock.service.ts:65` computes `currentLevel.quantity + data.quantity` in JavaScript | Two concurrent movements under Prisma's default isolation lose one update. Stock silently drifts from the movement ledger — invariant I5. Fix: `update({ data: { quantity: { increment: qty } } })` or an upsert with increment |
| D9 | S2 | **No cost captured on stock movements, no valuation layers** | `StockMovement` has quantity but no unit cost; `Product.averageCost` is a single mutable field | Stock value, COGS and historical margin are unknowable. Invariant I6 cannot be satisfied. Every margin figure the product shows is at best approximate |
| D10 | S2 | **Accounting periods are never enforced** | `AccountingPeriod` model exists; no code reads `status` before posting | Anyone can post into a closed period. Invariant I8 |
| D11 | S2 | **Payments are 1:1 with an invoice** | `Payment.invoiceId` is required | One transfer settling five invoices is impossible; so are advances and on-account payments. There is no reconciliation model at all, so "paid" is a stored field rather than a derived fact |
| D12 | S2 | **No `partnerId` on `JournalEntryLine`** | schema | An aged receivable or payable cannot be produced from the ledger. The README's "engine connecting AP, AR and GL" cannot be true without this |
| D13 | S2 | **`ensureStandardCOA` will create a tenant called "Demo Enterprise SARL"** with a hardcoded ICE if the tenant id is not found | `coa.service.ts:23` | Leftover scaffolding invoked from the invoice posting path. A stale or wrong tenant id silently creates a phantom company |
| D14 | S2 | **Tax is a bare `tvaRate Float` on the product** | `schema.prisma:216` | No tax entity, no exemptions, no fiscal position, and no snapshot on documents. When a rate changes, history changes with it — invariant I7 |
| D15 | S2 | **`PhysicalInventory` and `CreditNote` are header-only** | schema | Counts and credit notes cannot actually be performed |
| D16 | S3 | **Zero indexes in the schema** | `grep '@@index'` → 0 | Every tenant-scoped list is a sequential scan. Fine at 50 rows, not at 50,000 |
| D17 | S3 | **No automated tests** | 0 test files under `src` | Nothing protects the migrations this list requires. The root `test-*.mjs` scripts hardcode `C:/Users/Liad Tech/.gemini/...` — another machine's path — so they do not run anywhere else |
| D18 | S3 | **`prisma db push` instead of migrations** (per README) with four stale migrations on disk | `README.md`, `prisma/migrations/` | No reproducible schema history; a production database cannot be evolved safely |
| D19 | S3 | **59 `: any` annotations** despite `strict: true`; `tx: any` throughout the posting code | across `src` | The type system is switched off exactly where correctness matters most |
| D20 | S3 | **Duplicated finance modules** (`src/modules/fi` and `src/modules/finance`) | tree | Two sources of truth for reports |
| D21 | S3 | **Root directory contains ten one-off `fix-*.js` / `update-*.js` scripts and an `override-tenant.js`** | repo root | Development debris; `override-tenant.js` in particular is a footgun to ship |
| D22 | S3 | **README overstates delivery** — "initializes the Moroccan Chart of Accounts" is 7 hardcoded accounts | `coa.service.ts:6-14` | Fine internally; damaging in front of a customer or an accountant who checks |

---

## 4. Coverage against the blueprint

| Blueprint section | Status in NexaERP | Notes |
|---|---|---|
| §3.2 Tenancy, users, roles | **Partial** | Tenant/User/Membership/Role present; no company-scoped roles, no permission strings, no audit log |
| §3.3 Partners | **Good** | `Company` unified with a `type` field — the right call |
| §3.4 Products, UoM | **Partial** | Product exists; `unit` is a string, no UoM conversion (acceptable V1 simplification) |
| §3.5 Locations, moves, quants, valuation | **Partial** | Movements + levels yes; no locations, no lots, no reservations, no valuation layers |
| §3.6 Taxes, price lists, fiscal positions | **Missing** | Only a rate on the product |
| §3.7 Accounting core | **Partial** | Accounts, entries, lines, periods yes; no journals, no fiscal years, no analytic, no reconciliation |
| §3.8 Trade documents | **Partial** | Headers exist across the chain; **lines missing** past the quote |
| §3.9 Sequences, audit, attachments, outbox, idempotency | **Sequences only** | No audit log, no attachments, no outbox, no idempotency keys |
| §5.1 Order to cash | **Partial** | Quote → order → delivery → invoice → payment exists as status transitions; no reservations, no partial delivery, no COGS posting, no backorders |
| §5.2 Procure to pay | **Good for a V0** | PO → receipt → stock movement → bill is implemented; no three-way match |
| §5.3 Inventory flows | **Partial** | Receipt and delivery only; no transfers, no counts, no scrap, no landed cost |
| §5.5 Period close | **Missing** | Model exists, no process, no enforcement |
| §5.6 Returns and credit notes | **Header only** | |
| §5.7 Bank reconciliation | **Missing** | |
| §6 Engines | **Mostly missing** | Numbering exists (with D3). No pricing, tax, availability, costing, currency or rounding engine |
| §7 Non-functional | **Weak** | No idempotency, no audit, no outbox, no jobs (bullmq is a dependency but unused as far as I can see), no indexes, no tests |
| §8 SaaS layer | **~5%** | Plan string + feature config. Missing subscriptions, prices, billing invoices, payment methods, usage, dunning, limits, admin console |
| §9 Localization / e-invoicing | **~10%** | DGI fields on the invoice; no UBL, no signature, no clearance client, no certificates, no submission table |
| §10 Build order | **You are inside Phase 1–2** | Master data and a first pass at invoicing exist; the accounting spine is not yet trustworthy |

---

## 5. Where you actually are

Against the blueprint's five phases: **you are at roughly Phase 1.5 of 5** — master data done,
accounting spine started but not sound, inventory started but not valued, sales and purchase
present as flows without lines.

Against the strategy file's calendar: **the January 2027 obligation is ~117 days away and the
single feature that makes the product legal — DGI clearance — is blocked behind a schema change
(D2, invoice lines) that must land first.** That is the whole picture in one sentence.

The good news is that none of the work is wasted. The module layout survives, the posting logic
survives, the stock ledger survives, the UI survives. What has to change is the schema underneath
them, and schema changes are cheapest right now — at one commit, no customers and no production
data. Every week of new features makes D1 and D2 more expensive.

---

## 6. Milestones

### M0 — Stop the bleeding (this week, ~2 days)

Not features. Preconditions for being able to change anything safely.

```
[ ] Switch from `prisma db push` to real migrations; delete the stale ones and re-baseline
[ ] Add vitest integration tests against a throwaway Postgres:
      - posting an invoice produces a balanced entry
      - stock movement + level stay consistent over 100 random movements
      - tenant A cannot read tenant B (call every service with a foreign id)
[ ] Delete the root fix-*.js / override-tenant.js debris and the foreign-path test scripts
[ ] Run `npm run build` and make it pass; treat it as the type gate
```

### M1 — Fix the foundation (1–2 weeks) — do this before any new feature

```
[ ] D1  Float -> Decimal(18,6) across the schema, one migration, tests green
[ ] D2  Add InvoiceLine, SalesOrderLine, DeliveryNoteLine, CreditNoteLine, SupplierBillLine
        (product, description, qty, unitPrice, discount, taxRate snapshot, line totals)
[ ] D3  Make the sequence transaction-aware: pass `tx` in, consume the number inside the caller's
        transaction, and do not advance it on failure
[ ] D4  One posting path. Finalising an invoice always posts; nothing sets "Finalized" directly
[ ] D5  @@unique([tenantId, number]) on Invoice, SalesOrder, CreditNote, JournalEntry, Devis
[ ] D7  Replace `data: any` with a zod-validated DTO; add tenantId to every `where`
[ ] D8  Atomic `increment` on StockLevel
[ ] D10 Period check in the posting service
[ ] D13 Remove the tenant upsert from ensureStandardCOA
[ ] D16 Indexes on every (tenantId, <filter column>) pair used by a list query
```

**Exit criteria:** an invariant test suite that seeds a tenant, runs 200 random operations, and
asserts the ledger balances, stock equals the sum of movements, and no cross-tenant read is
possible.

### M2 — Trustworthy accounting (2 weeks)

```
[ ] D6  Postgres RLS on every table + `set local app.tenant_id` per request
[ ] D11 Payments decoupled from invoices + a reconciliation model
[ ] D12 partnerId on JournalEntryLine -> real aged receivable and payable
[ ] D14 A Tax entity with dated rates, snapshotted onto document lines
[ ] Audit log on confirm / post / cancel / override
[ ] Reversal instead of void; credit notes with lines
[ ] The five reports that make an accountant accept the tool: trial balance, general ledger,
    aged AR, aged AP, VAT declaration figures
```

### M3 — The compliance gate (3–4 weeks) — this is the one with the deadline

Implement blueprint §9.2 as written: `InvoiceClearancePort` with a swappable adapter,
`einvoice_submissions` with attempts and reserved numbers, `einvoice_certificates`, the extended
invoice state machine, queue and backoff retries, a translated reject-code table, and the
month-end "did everything clear?" job.

**Blocked on the strategy file's §11 U1–U3:** whether editors need accreditation, what the API
actually is, and who holds the certificate. Answer those in parallel — they can invalidate the
approach, not just delay it.

### M4 — Sellable (November 2026)

```
[ ] Onboarding to first cleared invoice in under an hour, unattended
[ ] Excel import: partners, products, opening balances, open invoices
[ ] Legal invoice PDF with all mandatory mentions, archived at post time
[ ] Receivables chasing (the feature that makes them feel money)
[ ] Real SaaS layer: plans, subscriptions, billing invoices, limits (blueprint §8)
```

### M5 — After January 2027

Stock valuation and COGS (D9), landed costs, three-way match, bank statement import, the
fiduciaire console, second vertical. Not before.

---

## 7. The three things to take away

1. **Fix D1 and D2 before writing another feature.** They are cheap today and compounding.
2. **Write the invariant test suite before the migrations**, or you will not know what the
   migrations broke.
3. **The clearance module is the deadline**, and it is blocked behind D2. That dependency chain —
   invoice lines → UBL → clearance → sellable — is the critical path of the whole business.

---

## 14. What was rebuilt

Work done on branch `hardening/foundation`, commit `88918a4`, in a working copy at
`Desktop/projects/NexaERP`. 130 files changed, +10 173 / −4 505.

**Verified, not asserted:** `tsc --noEmit` clean, `eslint` 0 errors, `next build`
succeeds, and 55 tests pass against a real PostgreSQL instance connected as the
restricted application role, so row level security is exercised rather than bypassed.

### 14.1 Defect register — resolution

| # | Defect | State |
|---|---|---|
| D1 | Money as `Float` | **Fixed.** 114 `Decimal(18,6)` columns, zero `Float`. A Decimal money module with rounding rules; `Serialized<T>` converts at the React boundary and makes arithmetic on a Decimal a compile error |
| D2 | No line items | **Fixed.** `InvoiceLine`, `SalesOrderLine`, `DeliveryNoteLine`, `CreditNoteLine`, `SupplierBillLine`. The printed invoice now shows the invoice instead of reaching back through the order to the quotation |
| D3 | Sequence consumed outside the transaction | **Fixed.** `nextNumber(tx, ...)` takes the caller's transaction; a test proves a failed save leaves no gap, and ten concurrent callers get ten distinct numbers |
| D4 | Invoice Finalized without posting | **Fixed.** One posting path (`postInvoice`); nothing else sets a posted status. The invariant checker reports any posted invoice without a ledger entry |
| D5 | No unique document numbers | **Fixed.** 12 `@@unique([tenantId, number])` constraints |
| D6 | No row level security | **Fixed.** RLS + FORCE on every tenant table, a non-superuser `nexaerp_app` role, `withTenant()` setting the context per transaction, and tests proving a cross-tenant read returns nothing and a cross-tenant write is refused |
| D7 | `data: any` mass assignment | **Fixed.** Explicit allow-listed fields, typed inputs, `tenantId` in every `where`. Zero `: any` outside generated code |
| D8 | Read-then-write stock update | **Fixed.** Atomic `INSERT ... ON CONFLICT DO UPDATE`; a test fires 20 concurrent movements and asserts none is lost |
| D9 | No cost on movements | **Fixed.** `ValuationLayer` ledger, AVCO and FIFO with the blueprint's worked examples as tests, stock value tied to the 3111 balance |
| D10 | Periods never enforced | **Fixed.** Open / SoftClosed / Closed, with the soft-closed override audited |
| D11 | Payments 1:1 with invoices | **Fixed.** `PaymentAllocation`; one payment settles several invoices, partial payments and bounced cheques both tested |
| D12 | No partner on ledger lines | **Fixed.** `companyId` on `JournalEntryLine`, which is what makes the partner ledger and real ageing possible |
| D13 | `ensureStandardCOA` inventing a tenant | **Fixed.** Removed. Seeding creates accounts, journals, VAT rates and the calendar — never a company |
| D14 | Bare `tvaRate` on products | **Partly fixed.** A dated `Tax` entity exists and rates are seeded as data; the per-line rate is still the operative field, with the breakdown snapshotted onto the document at posting |
| D15 | Header-only counts and credit notes | **Fixed.** `PhysicalInventoryLine`; credit notes have lines and support partial credits with an over-credit guard |
| D16 | No indexes | **Fixed.** 60 `@@index` entries |
| D17 | No tests | **Fixed.** 55 tests: invariants, engines, end-to-end flows, invariant checker. The foreign-machine Playwright scripts are gone |
| D18 | `db push`, stale migrations | **Fixed.** Re-baselined; a second migration carries RLS, check constraints and the immutability triggers |
| D19 | 59 `: any` | **Fixed.** Zero. View types are derived from Prisma payloads through `Serialized<T>` |
| D20 | Duplicated finance modules | **Partly fixed.** The legacy `journal.service` is gone and reports have one implementation; the `fi/` folder remains as a thin façade over `finance/` |
| D21 | Root-level dev debris | **Fixed.** Ten `fix-*.js`, `override-tenant.js` and the foreign test scripts removed |
| D22 | README overstating delivery | **Fixed.** Rewritten, including an explicit "deliberately not built" section |

### 14.2 Added beyond the register

- **E-invoicing module (F-EINV)** — UBL 2.1 generation with local pre-flight, clearance
  state machine, queue with exponential backoff, translated reject codes, the number
  reused across attempts, and a swappable transport (SANDBOX / DIRECT_DGI / operator).
  The direct DGI adapter is deliberately inert until §11 U1–U2 are answered.
- **Three-way match** — PO vs receipt vs bill with tolerances, returning exceptions for
  a human to accept with a reason rather than throwing them away.
- **Invariant checker** — seven checks (unbalanced entries, stock drift, value mismatch,
  residual drift, orphan posted invoices, sequence gaps, uncleared invoices) with a
  health score, meant to run nightly.
- **Entitlements service** — the single bridge between billing and the product: feature
  gates, hard limits for structural counts, soft limits for volume, and a read-only
  suspension that never blocks a tenant from reading or exporting their own data.
- **Audit log** written inside the same transaction as the change it describes.
- **CI** running migrations, typecheck, lint, tests and build against a Postgres service.

### 14.3 Two real bugs the new tests caught

1. **Reversed entries were excluded from balances.** A reversal is a separate entry, so
   dropping the original while counting the reversal subtracted every correction twice.
   Cancelling an invoice left the receivable at −1 200 instead of 0.
2. **The same fault hid a bounced cheque**, leaving the cheques-to-collect account at
   −500 after the reversal.

Both were invisible to a human reading the code and obvious to a test that asserted a
ledger balance after a full cycle. That is the argument for the suite in one paragraph.

### 14.4 Revised ratings

| Dimension | Before | After | Why |
|---|---|---|---|
| Architecture and code organisation | 7 | **9** | Module boundaries kept; one writer per ledger; pure logic separated from server actions; billing reaches the product only through entitlements |
| Data model correctness | 3 | **9** | Decimal throughout, line items, valuation layers, allocations, unique numbers, indexes |
| Accounting integrity | 4 | **9** | Exact balance with no epsilon, period enforcement, reversal-only corrections, partner on lines, database triggers as a second line of defence |
| Inventory | 4 | **9** | Single writer, atomic levels, AVCO and FIFO with valuation layers tied to the GL, rebuildable cache |
| Multi-tenancy and security | 5 | **9** | RLS forced, restricted role, per-transaction context, cross-tenant tests, no mass assignment |
| SaaS / billing layer | 2 | **7** | Plans, subscriptions, entitlements, usage counters, read-only suspension. No billing run, dunning or proration yet |
| Morocco compliance | 3 | **8** | Full CGNC seed, dated VAT rates, UBL 2.1, clearance state machine and queue. Capped at 8 until the transport and accreditation questions are answered |
| Testing and quality gates | 2 | **9** | 55 tests against real Postgres, invariant checker, CI on the full chain |
| Documentation | 6 | **8** | Honest README with a "not built" section; every non-obvious decision carries its reason in the code |
| **Overall** | **≈4** | **≈8.7** | |

Not 10, and the missing points are specific: no billing run or dunning (blueprint
§8.4.6–7), no bank reconciliation, no import wizard, and the clearance transport is a
sandbox until the DGI procedure is confirmed.

### 14.5 What to do next

1. Answer the three unknowns in the strategy file §11 (U1 accreditation, U2 API and
   sandbox, U3 certificates). The clearance adapter is ready for whatever the answer is.
2. Point the app at a database where the migrations have been applied by the owner and
   the app connects as `nexaerp_app`. Connecting as the owner silently disables tenant
   isolation — that is the one operational trap in this design.
3. Build the billing run and dunning; entitlements already read the subscription.
4. Bank statement import and reconciliation — the next thing an accountant asks for.
5. Schedule the invariant checker nightly and alert on any violation.
