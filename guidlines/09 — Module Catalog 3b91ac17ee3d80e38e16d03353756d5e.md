# 09 — Module Catalog

# 

SAP names its modules (FI, CO, SD, MM, WM...) so buyers and consultants can talk about the product in discrete, learnable blocks. Nexa-ERP should do the same — it makes the product easier to explain to a prospect, easier to price/package later ("enable this module"), and easier for the agent to build one coherent piece at a time. This catalog gives each module a short code, its purpose, exactly how it works end-to-end, what it touches in other modules, and how it maps to what a Moroccan small enterprise actually does day to day.

This is a **restatement and packaging** of what's already specified in `05-data-model.md` and `06-scenarios-and-flows.md` — the module boundaries here should match `04-architecture.md` §2's `/src/modules` folders. Nothing new is being invented; this is the "explain it to a customer or a new agent session in 2 minutes" version.

---

## CRM — Customer Relationship Management

**Purpose:** stop losing track of prospects, clients, and the conversations/promises made to them. The single biggest named pain point for Moroccan SMEs ("relances oubliées" — forgotten follow-ups).

**Core objects:** Company (customer/prospect), Contact (person), Opportunity (a potential sale, staged), Activity (a call/meeting/note/task tied to any of the above).

**How it works:**

1. Every Company and Contact lives in one address book, tagged and searchable, shared across the whole team (no more "it's in Youssef's WhatsApp").
2. A salesperson opens an Opportunity when there's a real chance of a sale — gives it a stage (New → Qualified → Devis Sent → Won/Lost) and an estimated value.
3. Every interaction — a call, a WhatsApp exchange, a site visit — gets logged as an Activity against the Company/Contact/Opportunity, building a timeline anyone on the team can read before calling that client back.
4. Activities can carry a due date and become a task; a nightly background job scans for due/overdue tasks and pings the owner (in-app + email digest) — this is the mechanism that directly kills the "forgotten follow-up" problem.
5. The pipeline view shows every open Opportunity with "days since last activity" front and center, so a stalled deal is visible at a glance, not discovered three weeks later.

**Talks to:** Sales & Distribution (an Opportunity converts into a Devis, and stays linked both ways so pipeline value reflects real open quotes).

**Typical use case:** Youssef gets a WhatsApp message from a new prospect. He adds the Company and Contact in 30 seconds, logs the conversation, sets a follow-up for Thursday. Thursday morning, he gets a reminder before he's even had coffee — no notebook, no memory required.

---

## SD — Sales & Distribution

**Purpose:** the actual commercial engine — turning interest into a quote, an order, a delivery, and a paid invoice, without retyping anything at each step. This is the highest-value, highest-risk module in the product (see `06-scenarios-and-flows.md` Module C for the exact transactional rules).

**Core objects:** Devis (Quote), Commande client (Sales Order), Bon de livraison (Delivery Note), Facture (Invoice), Credit Note (Avoir).

**How it works:**

1. **Devis**: pick a client, add product/service lines (price and TVA rate pre-fill from the Catalog module, both editable), get a live-computed total, generate a branded PDF, send it. A Devis never touches stock — it's a promise, not a commitment.
2. **Conversion to Commande**: once the client accepts, one click turns the Devis into a Sales Order — lines are copied over, nothing is retyped, and the system prevents converting the same Devis twice (no duplicate orders from a double-click).
3. **Conversion to Bon de livraison**: when goods/services actually go out (fully or partially), a Delivery Note is posted — this is the exact moment stock moves (see Inventory module below), all inside one database transaction so stock and the delivery record can never disagree.
4. **Conversion to Facture**: the invoice is generated from what was actually delivered, gets a strictly sequential legal number at the moment it's finalized, and becomes immutable from that point — any correction after that must be a Credit Note, never a silent edit. This isn't just good practice, it's a Moroccan accounting requirement (see `08-compliance-morocco.md`).
5. **Payments** are recorded against the invoice (partial payments allowed), automatically updating the client's balance and the invoice status (Sent → PartiallyPaid → Paid), and flowing straight into the client ledger.

**Talks to:** CRM (Opportunity link), Catalog (product/price/TVA data), Inventory (stock movements on delivery), Finance (TVA totals, receivables), Compliance (invoice becomes the source document for DGI submission).

**Typical use case:** Aicha quotes a client for 50 units, the client accepts by phone, she converts the Devis to an order in one click, ships 30 units next week (partial delivery, stock drops by 30 automatically), invoices exactly those 30, and records a bank transfer payment two weeks later — the whole chain stays consistent without her re-entering a single line item.

---

## MM — Purchasing (Materials Management)

**Purpose:** manage what the business buys from its own suppliers, and make sure what gets ordered is what actually arrives.

**Core objects:** Supplier (a Company with type=supplier), Purchase Order, Goods Receipt.

**How it works:**

1. A Purchase Order is created against a Supplier with product lines, quantities, and unit costs — this is a plan, and like a Devis, it does not touch stock by itself.
2. When goods physically arrive (fully or partially), a Goods Receipt is posted against the PO — this is what creates the stock movement, mirroring the sales-side rule that only the delivery/receipt event moves inventory, never the order/quote stage.
3. The PO status tracks itself (Draft → Sent → PartiallyReceived → Received) based on what's actually been received versus ordered.

**Talks to:** Inventory (stock increases on receipt), Finance (supplier costs feed into TVA déductible and, later, payables tracking).

**Typical use case:** Aicha orders 200 units of a component from her usual supplier. They deliver 150 now and 50 next week. She receives 150 today — stock goes up by exactly 150, the PO shows "partially received," and next week's receipt closes it out.

---

## INV — Inventory / Warehouse

**Purpose:** always know what's actually in stock, without a monthly manual recount, and warn before something runs out.

**Core objects:** Warehouse, Stock Level (a live snapshot per product per warehouse), Stock Movement (the permanent, append-only ledger of every unit in or out).

**How it works:**

1. Every single change to stock — a sales delivery, a purchase receipt, a manual correction — is recorded as a Stock Movement first; the Stock Level shown on screen is always a derived total of those movements, never a number someone can silently overwrite.
2. This means the system can always answer "why is stock at this number?" by showing the movement history — critical for trust and for catching mistakes.
3. Manual adjustments (stock takes, breakage, corrections) are allowed but always require a note and are logged like any other movement — nothing changes stock invisibly.
4. Each product can define a reorder threshold; a nightly check flags anything below it on the dashboard so restocking happens before a client order can't be fulfilled.
5. Multi-warehouse is supported from the data model even if most small tenants only ever use one.

**Talks to:** Sales (decremented by deliveries), Purchasing (incremented by receipts).

**Typical use case:** at month-end, Aicha's ops person doesn't need to physically recount everything to trust the numbers — every unit that moved is traceable to a specific delivery, receipt, or logged adjustment.

---

## FI — Finance & Accounting (light)

**Purpose:** give the business (and its outsourced accountant) the numbers it legally and practically needs, without building a full general-ledger accounting system. This is deliberately **reporting over the Sales/Purchasing documents**, not double-entry bookkeeping — see `05-data-model.md` §7 for why.

**Core objects:** derived from Invoices, Payments, and Purchase costs — no separate ledger entities in MVP.

**How it works:**

1. **TVA Summary**: for a chosen period, sums TVA collected (from finalized sales invoices) and TVA deductible (from purchase costs), grouped by rate (0/7/10/14/20%) — formatted for handing straight to the accountant or re-keying into the official tax filing.
2. **Aged receivables**: per client, shows total invoiced, total paid, balance due, and how overdue it is (0-30/31-60/61-90/90+ days) — this is what turns "who owes us money" from a guessing game into a report.
3. **Client ledger**: drill into any client to see every invoice and payment against them, in order — the definitive record for a billing dispute.
4. **Sales reports**: revenue by period, client, product, or salesperson, feeding the dashboard charts.
5. Everything exports to Excel/CSV in a layout ready for an external accountant, who — per the product's design — is treated as a periodic consumer of exports, not a daily user of the system.

**Talks to:** Sales (invoices/payments are its raw material), Compliance (TVA figures must match what's declared/cleared through DGI once e-invoicing is live).

**Typical use case:** at month-end, Aicha's outsourced accountant asks for "the TVA numbers and who still owes us." Both come out of this module as a clean export in under five minutes, instead of a week of emailing spreadsheets back and forth.

---

## COMP — Compliance & E-Invoicing

**Purpose:** keep every invoice legally valid under Moroccan rules — sequential numbering today, and full DGI clearance once the tenant's regulatory wave requires it (see `08-compliance-morocco.md` for the full legal detail).

**How it works:**

1. Every invoice is built from day one with the fields required for structured e-invoicing (UBL 2.1/CII XML) sitting alongside its normal data — nothing needs to be redesigned later, only switched on.
2. When a tenant's compliance wave arrives (most Nexa-ERP customers land in Wave 3, effective 1 Jan 2027), finalizing an invoice triggers XML generation and submission to the DGI's Simpl-TVA platform in the background, with automatic retries on transient failures.
3. The invoice carries a visible status — Pending / Cleared / Rejected — so the business always knows whether a given invoice is only "issued" or fully "legally cleared."
4. Because finalized invoices are immutable (see Sales & Distribution above), a DGI rejection is fixed the same way any invoice error is fixed: a Credit Note plus a corrected new invoice, never a silent edit — which is also exactly what the DGI clearance model requires.

**Talks to:** Sales & Distribution (invoices are its source document), Finance (cleared totals must reconcile with the TVA summary).

**Typical use case:** once live, a client-facing invoice isn't "final" the moment Aicha clicks send — it's final once the DGI clears it, usually within seconds, and the app makes that distinction obvious instead of hiding it.

---

## DOC — Document Attachments (light GED)

**Purpose:** keep the paperwork that surrounds a deal (signed devis, ID/RC copies, delivery slips, supplier contracts) attached to the record it belongs to, instead of scattered across email and phone galleries.

**How it works:** any Company, Contact, Opportunity, or commercial document can carry file attachments (stored in Supabase Storage), so anyone opening that record sees the paperwork with it, not somewhere else.

**Talks to:** every module — this is a thin, shared capability rather than its own business process.

**Typical use case:** a signed paper devis gets photographed and attached directly to the digital Devis record — no separate filing system to maintain.

---

## Module toggling & packaging (how this maps back to the product)

Per `02-product-vision-scope.md` and `04-architecture.md` §2, every module above is:

- **Built on the shared core** (Companies, Contacts, Products) — never a data silo of its own.
- **Toggleable per tenant** via `Tenant.enabledModules` — CRM and Sales & Distribution are always on (they're the product's core value); Purchasing and Inventory are opt-in for tenants that don't hold physical stock (e.g. pure service businesses); Compliance activates automatically based on the tenant's regulatory wave; Document Attachments is a shared capability, not a toggle.
- **A candidate for future pricing tiers** — even though pricing isn't decided yet, naming modules this clearly (à la SAP FI/CO/SD/MM) sets you up to eventually say "Starter = CRM + SD, Pro = + MM + INV + FI" without re-architecting anything.

## Not yet a module (deliberately, see `02-product-vision-scope.md` §4)

- **HR / Payroll** — out of scope; a light employee directory could be added later purely for internal notes/ownership, not real HR.
- **PP — Production/Manufacturing (MRP, BOM)** — out of scope; Nexa-ERP targets trading/service businesses, not manufacturers with production planning needs.
- **BI/Advanced Analytics** — the Finance module's reports are enough for MVP; a dedicated BI layer is a post-MVP idea (`07-roadmap-mvp.md` Phase 7+).