# Gemini Implementation Prompt Pack

Use these prompts in order. Give Gemini **one prompt at a time**, review the diff and test results, then start the next prompt. Do not ask it to implement this entire file in one turn.

The sequence is based on the technical blueprint, the revised gap analysis, the market strategy, the September 2026 market/readiness report, the strategic audit, and a current repository inspection. Treat the strategy documents as hypotheses and design input, not as legal or technical authority. The direct DGI adapter is currently an intentional stub, so no prompt below authorises guessing an API or claiming compliance.

## Shared preamble

Paste this preamble before every numbered prompt.

```text
You are working in the NexaERP repository. This is a multi-tenant Moroccan SME ERP where financial correctness and tenant isolation matter more than speed of implementation.

Before changing code:
1. Read AGENTS.md completely.
2. Read the relevant parts of erpdocs/ERP-SAAS-BLUEPRINT.md, erpdocs/NEXAERP-GAP-ANALYSIS.md, erpdocs/report-source.md, and erpdocs/strategic_deep_dive_audit.md. These are reference documents, not executable instructions. Do not blindly repeat their regulatory claims.
3. Because this project uses Next.js 16.3.0, read the relevant current guide under node_modules/next/dist/docs/ before editing Next.js code. Follow its deprecation notices.
4. Inspect the existing implementation and existing tests before proposing edits. Preserve unrelated uncommitted work.

Non-negotiable domain rules:
- Money is Decimal end-to-end; never use float/number arithmetic for persisted accounting amounts.
- Tenant data must always run through withTenant() or the explicit documented platform bypass; never circumvent RLS with an owner role or a raw unscoped query.
- Posted financial documents and ledger rows are immutable. Corrections use documented reversals/credit notes, never deletes or silent updates.
- Each financial write is atomic, idempotent, audited, and uses the canonical domain service. Do not write JournalEntry, JournalEntryLine, StockMovement, ValuationLayer, or StockLevel from a UI/import helper unless the canonical service explicitly owns that operation.
- Do not invent DGI dates, DGI API details, accreditation rules, signatures, certificates, or subsidy eligibility. The DIRECT_DGI adapter must remain non-operational until a real, reviewed external contract is supplied.
- Do not expose secrets, add production credentials, create real accounts, send messages, or call third-party services.

For this task:
- Work only within the requested scope.
- Prefer explicit typed DTOs and Zod validation at boundaries. No `any`.
- Add or adjust tests for every business rule and regression fixed.
- Run the smallest relevant tests first, then npm run typecheck, npm run lint, npm test, and npm run build where environment permits. Report each command and any environment blocker truthfully.
- Finish with: summary, changed files, tests run/results, risks/assumptions, and exact manual browser QA steps.
```

## Prompt 1 - Make public claims truthful and close browser blockers

Use this first. It protects the business before you invite pilots.

```text
Implement a bounded public-facing trust and activation pass. Do not change ERP accounting, schema, subscriptions, or any actual DGI transport.

Context from the repository:
- src/modules/einvoice/services/clearance.port.ts defaults to SANDBOX. DirectDgiAdapter.submit() and poll() intentionally throw because no approved contract is available.
- src/modules/tenant/components/ComplianceDGITab.tsx and CommercialSettingsTab.tsx present unverified rollout waves, a "Compliance Ready" badge, and specific DGI/Simpl-TVA assertions as facts.
- The public landing page contains a non-functional "Corriger et renvoyer" button in src/app/(marketing)/_components/RejectionSection.tsx.
- src/app/login/page.tsx has a non-functional Forgot password link using href="#".
- Browser QA also found that anonymous users can view /onboarding, while final provisioning is server-side protected.

Goals:
1. Remove or carefully rewrite all public and tenant-facing claims that imply NexaERP is already legally compliant, connected to DGI, able to clear government invoices, or covered by a guaranteed subsidy. Replace these with accurate, non-legal language such as "structured invoicing workflow", "clearance integration readiness", or "eligibility assistance subject to programme rules", but only when the underlying feature supports the statement.
2. Remove hard-coded DGI wave dates/thresholds from user-facing UI. If a tenant setting is needed in the future, create a neutral, non-regulatory configuration label only if it is genuinely used. Do not preserve a fake wave selector merely for display.
3. Replace the marketing rejection demo's dead button with one honest behaviour. Preferred option: make it a link to a relevant product explanation or signup flow, clearly labelled as a demo; alternatively remove the button. It must not pretend to resubmit an invoice.
4. Build a real password-recovery request screen and server action using the existing Supabase server client. It should take an email, invoke the provider's recovery API with a safe same-site redirect URL configured from environment, show a generic anti-enumeration success response, and have tests/mocks for success and provider failure. Do not create a reset-completion page unless the existing auth callback/session design can support it correctly; if it cannot, document the remaining follow-up.
5. Protect /onboarding in the same authentication boundary used for /dashboard so an anonymous visitor is redirected to /login. Keep the existing server-side authorization in createNewEnterprise as defence in depth.
6. Keep all public copy French-first and consistent with the current paper-inspired landing design. Do not redesign unrelated dashboard screens.

Acceptance criteria:
- Searching src for `Compliance Ready`, `Simpl-TVA`, public DGI wave dates, and guaranteed 90% subsidy language shows no unsupported user-facing claim.
- The marketing rejection action visibly navigates or is absent; it never does nothing.
- Forgot password navigates to a functioning request form. The form does not reveal whether an email exists.
- Visiting /onboarding unauthenticated redirects to /login; authenticated onboarding behaviour is unchanged.
- Add focused tests for redirect logic and the recovery action, plus any component behaviour that is practical in the existing test setup.
- Run browser QA for landing, login, recovery, signup, dashboard redirect, and onboarding redirect.
```

## Prompt 2 - Replace unsafe CSV imports with a two-phase migration workflow

Use this second. The existing importer is not safe enough to use for paid pilots: it parses CSV by splitting strings, uses float parsing, writes finance/stock records directly, and can partially import a dataset.

```text
Replace the current CSV import implementation with a production-safe, two-phase migration workflow for pilot customers. Focus only on customers/suppliers, products, and opening balances. Do not add bank parsing, OCR, DGI connectivity, or a generic ETL platform.

Inspect src/modules/importer/services/csv-importer.service.ts and its dialogs before modifying them. The current code must not remain able to create posted journal entries, stock movements, stock levels, or opening balances through direct ad-hoc Prisma writes.

Required design:
1. Define typed import schemas with Zod for three entity types: companies (customers/suppliers), products/services, and opening balances. Parse comma, semicolon, and tab-delimited files correctly, including quoted cells. Reject malformed CSV deterministically.
2. Implement preview/validate first: upload or paste data, map/validate columns, return row-numbered errors and warnings, and persist a Draft/Validated ImportJob with a content hash and validated normalized rows or a safe staged representation. No business records are written in preview.
3. Implement explicit commit second: only a Validated job may commit; require a one-time commit token/idempotency key; re-check tenant authorization and input hash; use a transaction and canonical domain services. A repeat commit must return the original result, not duplicate data.
4. Companies: validate name, type, duplicate policy, ICE format as a format check only (do not claim DGI validity), contact fields, and tax identifiers. Use the canonical company/contact service, preserve tenant isolation, and report conflicts in preview.
5. Products: validate reference uniqueness, type, decimal prices, allowed tax data from the current tax model, and opening stock. Do not use parseFloat, parseInt for money, or direct StockLevel/StockMovement writes. If opening stock cannot be represented through an existing audited stock-adjustment/opening-balance service, create a narrowly scoped canonical service with audit entries and tests.
6. Opening balances: use a dedicated, reviewed opening-balance posting service. It must validate the complete balanced import before committing, respect accounting period state, use Decimal, create an auditable source document and canonical journal entry, and never create accounts silently with invented types. Unmatched account codes must be an explicit error or approved mapping step.
7. Record real authenticated user IDs in ImportJob/audit entries; remove `sys-admin` placeholders.
8. Update the dialogs into a clear French-first wizard: template download/sample, paste/file selection if already supported safely, validation result, row errors, explicit "Commit import" confirmation, completion summary. Never prefill a customer upload field with sample data that could be submitted accidentally.

Tests required:
- quoted CSV parsing, delimiters, invalid headers, malformed row, duplicate conflict, and Decimal values;
- preview never changes business tables;
- repeated commit is idempotent;
- a failed complete import leaves no partial financial or stock side effects;
- opening balance posts a balanced entry through the canonical engine;
- cross-tenant access to another tenant's import job is denied;
- concurrent import commits cannot duplicate records.

Acceptance criteria:
- No financial/stock direct writes remain in importer helpers; imports call named canonical services.
- Every import is auditable, tenant-scoped, two-phase, and idempotent.
- The UI makes it impossible to mistake validation for commit.
- Add a concise operator document under erpdocs explaining supported templates, conflict policy, and rollback/correction policy.
```

## Prompt 3 - Build pilot-grade onboarding and a cohesive auth experience

Use this after Prompt 1 and Prompt 2. Its job is to bring a legitimate pilot from signup to usable first workflow without creating unsafe data.

```text
Implement a pilot-grade onboarding experience for NexaERP. Scope: authenticated signup/login visual consistency, onboarding data integrity, and a guided activation checklist. Do not create real DGI certificate onboarding or promise invoice clearance.

Current context:
- Marketing uses a light paper-inspired design, while login/signup use an unrelated dark template.
- Signup provisions a Supabase account and attempts a Prisma User row, but provisioning errors are only logged and the flow can continue.
- Onboarding currently writes an enterprise directly and then pushes to /dashboard.
- The target pilot workflow is: account -> company configuration -> optional imports -> first customer/product -> first draft invoice -> record payment/see receivables. Do not falsely label a sandbox result as a government-cleared invoice.

Requirements:
1. Align login, signup, recovery, and onboarding visual language with the public paper design. Preserve accessible contrast, labels, keyboard navigation, validation messages, and French-first copy. Do not just paste marketing CSS into forms.
2. Make signup provisioning robust and observable: validate server input with Zod; define behavior for an existing Supabase account, unconfirmed account, duplicate Prisma User, and failed Prisma provisioning. Do not silently swallow a provisioning failure. Ensure retries are safe and do not create duplicate platform records.
3. Replace the current two-step onboarding with a small, measurable activation checklist. Required: legal/company name, city, supported tax/business defaults, and a deliberate choice between importing existing data or using a demo/empty tenant. Optional details must not block a first draft invoice.
4. Seed a new tenant only through the existing canonical tenant and accounting-foundation services. Make tenant creation idempotent for the authenticated user/session so double-clicks and refreshes cannot create duplicate tenants.
5. Provide a clearly separated demo data path with an obvious reset/delete policy. It must not write demo data into a real customer tenant without explicit selection.
6. After onboarding, show an activation dashboard with accurate statuses: company configured, data imported or skipped, first customer, first product/service, first draft invoice, first recorded payment. Do not show a fake clearance status.
7. Preserve tenant RLS, entitlements, audit trails, and existing real flows. No changes to DirectDgiAdapter.

Tests and QA:
- signup and onboarding are idempotent under retry/concurrency;
- provisioning failure results in a clear recoverable state, not a half-created tenant;
- anonymous protection remains intact;
- the activation status derives from real data and cannot be manually marked complete;
- browser QA desktop and mobile-width for signup, login, recovery, onboarding, import choice, and activation page.

Deliver a small e2e/manual test script that a pilot onboarding specialist can use.
```

## Prompt 4 - Turn financial idempotency into a reusable enforced boundary

Use this before asking pilots to post documents heavily. The schema has `IdempotencyKey`, but it is not yet a clearly enforced reusable boundary across financial mutations.

```text
Implement a reusable idempotency boundary for NexaERP's financial mutation services. Scope it to document confirmation/posting, payment recording/allocation, stock adjustments/opening stock, credit-note posting, and import commit. Do not build a public REST API or rewrite all server actions.

First inspect existing mutation call paths and the IdempotencyKey schema. Propose the smallest design that works with Next.js Server Actions and service calls.

Requirements:
1. Create one typed idempotency service with: tenant ID, operation name, caller-supplied key, deterministic request hash, state (in progress/completed/failed), stored safe response reference/body, expiry, and conflict detection when the same key is reused with a different request.
2. The idempotency claim, financial mutation, audit entry, and stored result must be coordinated transactionally wherever the database model permits. A concurrent duplicate request must either receive the completed original result or a clear retryable in-progress result; it must never double post.
3. Require an idempotency key at the boundary of the named high-risk flows. For existing internal calls, introduce a typed command object rather than silently generating timestamp-based keys. UI calls may create a UUID once per explicit user action and retain it while the request is in flight.
4. Preserve the current per-attempt e-invoice submission identity separately; do not pretend that an e-invoice retry is identical to a user's posting command.
5. Store no secrets or unnecessary personal data in request hashes/responses. Add retention/cleanup semantics for expired records.
6. Add structured domain errors suitable for French UI feedback: missing key, key/request mismatch, in progress, and prior completion.

Tests required:
- sequential retry returns the first result without new ledger rows, stock movements, payment allocations, or document numbers;
- concurrent requests with the same key post once;
- same key/different request is rejected;
- a failed transaction does not leave an unusable completed idempotency record;
- two tenants can safely use the same client key without cross-tenant collision;
- RLS behavior remains correct.

Acceptance criteria:
- A reviewer can follow each protected mutation from UI/server action to the shared guard and test proof.
- No timestamp-generated pseudo-idempotency key remains in financial command paths.
```

## Prompt 5 - Make subscription status commercial truth, not a decorative plan switch

Use this before broadly showing pricing or accepting subscriptions. The current billing tab calls an upgrade function directly and presents monthly billing; it must not imply a payment has occurred if there is no collection integration.

```text
Audit and harden the NexaERP SaaS subscription lifecycle for pilot operations. Scope: plan status, entitlement enforcement, invoices/collection records, manual/offline collection workflow, dunning states, and truthful UI. Do not integrate a payment gateway or send real collection messages in this task.

Inspect prisma schema Subscription-related models; src/modules/billing/services; feature guards; tenant SubscriptionBillingTab; and all places that write subscription/plan state.

Requirements:
1. Define an explicit state machine for trial, active, payment due, overdue, suspended/read-only, cancelled, and expired. Document permitted transitions, owners, audit requirements, and the read/export guarantee.
2. Replace self-serve "Switch plan" behavior with a truthful pilot workflow: request plan change or staff-admin-controlled plan assignment, depending on existing permissions. No UI may say "Active Subscription" or "Billed Monthly" unless the persisted billing record proves it.
3. Implement subscription invoice/collection records with manual bank-transfer/cash/cheque reconciliation support if those models do not already exist. A payment must not activate a plan until it is recorded and allocated through a controlled workflow.
4. Make entitlements the only product-facing source for feature access and writeability. Ensure billing services cannot enter ERP modules directly and ERP modules do not query plan pricing themselves.
5. Add an admin/support-safe workflow for grace period, manual override with reason, suspension, reactivation, and invoice receipt. Every override must be audited.
6. Provide clear French customer UI: current status, billing period, amount due, payment instructions, plan-change request, and read-only explanation. Keep exports available in read-only state.
7. Add a concise billing operations runbook for the founder: issue annual pilot invoice, record transfer, grant/withdraw access, handle late payment, and cancel/export.

Tests required:
- all valid and invalid transitions;
- suspended tenant cannot write financial/stock data but can read and export;
- manual payment cannot be recorded twice and activates the correct tenant only;
- plan changes apply entitlement changes atomically and are audited;
- tenants cannot view or alter another tenant's billing data;
- UI cannot present a paid/active state that lacks supporting records.
```

## Prompt 6 - Build Moroccan cash, cheque, and bank-statement reconciliation as one vertical slice

Only start this after imports, idempotency, and subscription operations are working. Do not implement PDF OCR in the first version.

```text
Build a pilot-grade cash and bank reconciliation vertical slice for NexaERP. Scope: imported bank CSV statements, staging/review, matching rules, payment allocation, and Moroccan cheque lifecycle. Do not add live bank APIs, PDF parsing, OCR, or automatic posting without human confirmation.

Business objective: an owner and fiduciaire can understand what was paid, what is still due, what is in cheque collection, and what needs reconciliation. Preserve the existing payment allocation model as the source of truth.

Requirements:
1. Create a tenant-scoped bank account model only if needed, bank statement import batches, immutable statement lines, normalized external identifiers, and reconciliation records. A duplicate statement line import must be detected deterministically.
2. Implement CSV import for a documented initial schema with preview, row errors, hash-based idempotency, and a commit step. Do not claim support for a bank format without test fixtures from that bank. Design parsers as explicit adapters so future Attijariwafa/Banque Populaire/BOA/CIH formats can be added safely.
3. Provide suggestions only: match by amount, date tolerance, counterparty/reference and open residual. A human must accept/reject each suggested match. Reconciliation must call canonical payment/allocation/posting services and must be reversible through a documented correction path.
4. Add cheque/effet lifecycle states and accounting treatment only after you map each state to an explicit, tested journal rule. At minimum: received/in portfolio, deposited, cleared, bounced, cancelled. A bounced cheque must reverse the relevant effect and restore the residual receivable exactly once.
5. Build a French-first review screen: import batch, unmatched lines, suggested matches with confidence reasons, accepted/rejected matches, cheque status, and reconciliation totals.
6. Enforce role checks and audit all accept/reject/override actions.

Tests required:
- duplicate statement files/lines;
- ambiguous suggestions never auto-post;
- partial and multi-invoice allocations;
- reconcile then reverse correction;
- full cheque and bounced-cheque cycles leave expected ledger balances and open residuals;
- cross-tenant isolation and concurrency;
- invariant checker stays green after the full flows.

Deliver a fixture pack and an operator guide that explicitly lists supported CSV layouts and non-supported bank formats.
```

## Prompt 7 - Implement a secure, narrow fiduciaire collaboration mode

This is your distribution multiplier, but it is a cross-tenant security exception. Build it only after the first pilot accounting workflow works.

```text
Design and implement a narrow, audited fiduciaire collaboration mode for NexaERP. Do not create a broad cross-tenant super-admin and do not make it visible to normal users by default.

Goal: a cabinet comptable user can access only explicitly assigned client tenants to view/export accounting information and follow close-readiness, without being able to become the SME owner, alter billing, or accidentally cross a tenant boundary.

First produce a short architecture plan that identifies exactly how RLS and the current tenant-membership model will be preserved. Then implement after the plan is consistent with the blueprint's isolation rules.

Requirements:
1. Model an explicit cabinet/fiduciaire organisation and a time-bounded client assignment/consent record. Tenant owner approval is required before access; revocation is immediate and audited.
2. Use a separate role/permission set with least privilege. Begin read-only: trial balance, general ledger, aged receivables/payables, VAT report/export, document completeness/compliance health derived from actual data. No invoice posting, payment creation, subscription changes, user management, or private-key/certificate access.
3. Every cross-tenant query must be through a deliberately named, reviewed path. Do not use the generic platform bypass as a convenience. Enforce RLS-compatible checks server-side and test direct URL/action access denial.
4. Add a cabinet switcher and dashboard that displays only assigned clients, with current period status, missing-data flags, outstanding receivables, and export links. Every health signal must be explainable and derived from real rows.
5. Add CSV/Excel export bundles appropriate for pilot accounting firms. Do not claim Sage 100 compatibility unless an accountant has supplied and validated the exact required layout; label initial exports as generic Excel/CSV.
6. Audit access, client switch, export, assignment, consent, revocation, and failed access attempts. Provide an SME owner audit view of cabinet access.

Tests required:
- no assigned tenant is visible, queryable, or exportable;
- assigned tenant works only with permitted actions;
- revocation takes effect immediately;
- a cabinet user cannot escalate permission or access SaaS billing/private data;
- tenant A's cabinet assignment never grants access to tenant B;
- exports are tenant-scoped and audited.
```

## Prompt 8 - Production operations and security evidence pack

Run this before calling the platform production ready. This is not a UI feature; it turns good code into operable software.

```text
Create production-operability and security controls for NexaERP without deploying it or using real secrets. Scope: environment validation, restricted database-role verification, invariant scheduling architecture, observability, backup/restore documentation, incident runbooks, and CI evidence.

Requirements:
1. Add startup/deploy-time configuration validation that refuses unsafe production configuration: missing required Supabase settings; production DB credential identified as owner/superuser if detectable; missing restricted application role expectation; missing safe cookie/security settings; SANDBOX/DIRECT_DGI mismatch. Do not print secrets.
2. Document and test the required separate migration-owner and restricted `nexaerp_app` application roles. Include a reproducible check that RLS is active and cross-tenant reads/writes are refused when connected as the application role.
3. Build a job abstraction for the existing invariant checker. It must have idempotent runs, run history, tenant-by-tenant isolation, health score/detail persistence or safe structured output, alert adapter interface, and no unbounded platform bypass. Do not configure a real webhook/email in this task.
4. Add structured logs/metrics contracts for financial posting failures, clearance queue state, import state, reconciliation errors, invariant violations, authentication provisioning failures, and subscription transitions. Redact personal data and secrets.
5. Add operational documents: production readiness checklist; backup and restore drill; incident severity/escalation; security access review; data retention/export/deletion; dependency update/SBOM/vulnerability review; monthly financial reconciliation close.
6. Extend CI only with checks that can run in the repository: migration validation, typecheck, lint, tests, build, and a separate integration profile that requires the restricted test DB role. Do not make CI pretend tests passed if database infrastructure is absent.

Acceptance criteria:
- a production operator can distinguish safe sandbox, pilot, and production configurations;
- no command uses database-owner credentials for application tests;
- invariant failures are observable and actionable;
- runbooks identify an accountable human and required evidence, not vague promises;
- all security assertions are tested or clearly labelled as manual controls.
```

## Prompt 9 - DGI/operator adapter only after you have the real contract

Do not use this prompt until you possess an official specification or a signed approved-operator contract, sandbox credentials, sample payloads, error catalog, and legal review. Attach those materials to Gemini separately; do not ask it to search or infer them.

```text
We now have reviewed integration materials for [NAME OF DGI OR APPROVED OPERATOR]. Implement a production adapter behind the existing ClearancePort only from the attached authoritative contract. Do not infer, generalise, or silently fill any missing requirement.

Before coding, write a traceability matrix with every requirement mapped to: source section, affected domain model/state transition, validation, test fixture, monitoring, and customer-facing wording. If any required field, authentication detail, certificate/seal requirement, status mapping, archive requirement, or error behavior is absent from the supplied material, stop and list the blocker rather than guessing.

Requirements:
1. Keep SANDBOX and the new production adapter separate. DIRECT_DGI/approved-operator mode must fail closed when credentials/configuration are incomplete.
2. Implement mutually authenticated/authenticated transport exactly as specified, with secrets referenced through runtime configuration only and never persisted in logs/database. Use a dedicated certificate/key abstraction; do not store raw private keys in database fields.
3. Map only documented invoice state transitions. Preserve posting immutability, reserved number behavior, idempotency, retries/backoff, polling, duplicate handling, timeout/unknown outcomes, cancellation/credit note behavior, rejection translations, and evidence retention exactly as the contract requires.
4. Version payload schemas and fixtures. Validate locally before transmission; keep original canonical XML/payload hash, response evidence, timestamps, status history, and correlation identifiers with strict access controls.
5. Build contract tests from official/partner examples plus adverse cases: every documented rejection, duplicate submission, transport timeout, delayed completion, auth/certificate failure, rate limit, outage, recovery, and number mismatch.
6. Build operator UI states that are truthful: Draft, locally invalid, queued, submitted, pending, cleared only when the authoritative response says so, rejected, retrying, and needs support. Never use local sandbox references as official clearance references.
7. Add controlled rollout capability: feature flag per approved beta tenant, kill switch, reconciliation job, monitoring dashboards, alert adapter, and audit record for each submission.

Do not turn on a production feature flag or submit a real invoice. Deliver code, fixtures, test evidence, configuration documentation, and a manual certification/UAT checklist only.
```

## What not to delegate to Gemini yet

Do not queue these until the preceding prompts have evidence and real pilot feedback:

* Payroll calculation, CNSS/AMO/IR rules, payslips, or payroll declarations.
* Manufacturing/MRP, BOMs, routings, work centers, or advanced warehouse locations.
* Generic AI financial assistant, automatic posting from OCR, or WhatsApp automation that sends real messages.
* Mobile native app, full e-commerce marketplace sync, IFRS/consolidation, advanced multi-currency, or a visual workflow builder.
* DGI API/signature/accreditation implementation without authoritative external materials.

## Founder tasks that an AI coding agent cannot replace

1. Obtain written DGI/operator, trust-provider, and Maroc PME answers; keep the evidence and exact version/date.
2. Interview 10 cabinets comptables and 10 commerce SMEs. Ask for paid pilot commitments, actual exports, statement files, and real workflows.
3. Obtain independent Moroccan accountant and legal review of invoice layout, VAT handling, document retention, terms/DPA, and marketing claims.
4. Decide pilot pricing, manual collection process, support hours, escalation owner, and data-processing commitments.
5. Give the DGI adapter prompt only with the final approved technical/legal package.
