# 06 — Scenarios & Flows

Feed the agent only the relevant section when building that module.

## Module A — Onboarding & Tenancy

**A1. New tenant signs up:** signup (email/password or OAuth) → company basics (name, ICE, RC, IF, city, sector) → creates Tenant + first User as Owner → module toggle wizard (CRM/Sales/Invoicing always on; Purchasing/Inventory opt-in) → optional CSV import → dashboard with clear empty-state CTAs.

**A2. Owner invites a teammate:** Settings → Team → Invite (email + role) → scoped invite email (Resend/Postmark) → signup/login creates TenantMembership. Only Owner/Admin can invite; role sets default landing page and nav.

## Module B — CRM

**B1. Add a prospect + log first contact:** New Company (name, ICE optional, city, type=Prospect) → add Contact → create Opportunity (stage=New) → log Activity (call) + follow-up task (+3 days).

**B2. Follow-up reminder** (the #1 named pain — "relances oubliées"): daily BullMQ job scans overdue tasks → in-app + email digest to owner → mark done/reschedule. Every Opportunity must show "days since last activity" prominently.

**B3. Opportunity → Devis:** "Create Devis" pre-fills company/contact; stage auto-advances to DevisSent once Devis status becomes Sent; stays linked both ways (pipeline value ≈ sum of open devis).

## Module C — Sales Document Chain (the core flow)

**C1. Create & send Devis:** select Company/Contact/Opportunity, set validity (+15 days default), add lines (product search, price/TVA pre-fill, editable, discount%), live totals, Generate PDF (FR, logo, ICE/RC/IF), Send (email or download), mark Accepted manually. Devis never touches stock.

**C2. Devis → Commande:** "Convert to Order" creates SalesOrder with copied lines, sourceDocumentType/Id set, Devis→ConvertedToOrder (immutable from here). Idempotency: disable conversion once already converted.

**C3. Commande → Bon de livraison + stock hit:** create Delivery Note (can be partial) → on post: one StockMovement per line (negative, reason=SalesDelivery) in a DB transaction, StockLevel decremented, SalesOrder status updates. Default: warn (don't hard-block) on negative stock.

**C4. BL/Commande → Facture:** pre-fills from what was actually delivered. On Finalize: sequential number allocated in the same transaction; invoice becomes immutable; dgiSubmissionStatus set (Pending or NotApplicable per tenant's wave). Generate PDF, send. Draft invoices are freely editable; Finalized ones are not — corrections go through a Credit Note.

**C5. Record payment:** amount/date/method/reference → updates amountPaid/amountDue → status Paid/PartiallyPaid → client ledger updates immediately. Never allow amountPaid to exceed total silently.

**C6. Overdue handling:** nightly job flags dueDate<today & unpaid → status Overdue; dashboard surfaces total+count; optional auto-reminder email.

**C7. Credit Note (Avoir):** from a Finalized invoice, select lines/reason → own sequential number, reduces client balance, optional reverse StockMovement if goods are returned (ask per credit note).

## Module D — Purchasing & Inventory

**D1. Create PO:** select Supplier (Company w/ supplier type), add lines with qty+unit cost, Draft→Sent.

**D2. Receive goods:** from Sent/PartiallyReceived PO, Receive Goods (can be partial) → posts GoodsReceipt → positive StockMovements, StockLevel updated, PO status updates. The PO itself never touches stock — only receiving does.

**D3. Low stock alert:** optional reorderThreshold per product; nightly job flags StockLevel < threshold, surfaces on dashboard, optional email to Owner/ops.

**D4. Manual stock adjustment:** manual StockMovement (reason=ManualAdjustment) with a required note — always logged, never a silent StockLevel edit.

## Module E — Accounting & Reporting

**E1. Month-end TVA summary:** select period → sum TVA from Finalized sales invoices (collectée) and purchase costs (déductible) grouped by rate → export Excel/CSV.

**E2. Aged receivables:** per Company — total invoiced, paid, balance, aging buckets (0-30/31-60/61-90/90+); drill into client ledger.

**E3. Sales report:** filter by period/client/product/salesperson → totals + chart (Recharts) on dashboard and a dedicated report page.

## Module F — Compliance (phase 2, data model ready from day one)

**F1. Finalize → generate XML → submit for clearance:** on Finalize, if applicable, generate UBL 2.1/CII XML from stored fields → enqueue BullMQ job to submit to DGI/Simpl-TVA → on response, update dgiSubmissionStatus/dgiClearanceId/dgiClearedAt, or surface rejection (fixed via Credit Note + new invoice, since finalized invoices are immutable) → retry with backoff on transient failures, Sentry alert if Pending beyond 24h. Mark invoices clearly as "Pending DGI validation" in the UI until cleared.