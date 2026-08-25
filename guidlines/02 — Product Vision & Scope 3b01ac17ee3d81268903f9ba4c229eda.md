# 02 — Product Vision & Scope

## 1. Vision statement

**Nexa-ERP** is a modular B2B ERP/CRM SaaS built for Moroccan micro and small enterprises (1–50 employees) who currently run their business on Excel, WhatsApp, and paper. It replaces those with one connected system covering the commercial cycle (CRM → Devis → Commande → Livraison → Facture), inventory, purchasing, and light accounting — set up in under a day, usable without training, natively ready for Moroccan tax rules and the incoming DGI e-invoicing mandate.

Not trying to be Odoo or SAP — the "20% of features that 80% of small businesses actually use," built and operated by a single developer.

## 2. Target customer (ICP)

- 1–50 employees, most commonly 3–15.
- Sector-agnostic, especially: trading/distribution (négoce), small import/export, services with recurring invoices, small manufacturers/artisans with light stock, retail with a B2B wholesale side.
- Current tooling: Excel + WhatsApp + paper.
- Buying triggers: e-invoicing pressure, accountant asking for clean records, losing track of a customer/order, hiring first salesperson.
- Not the target: large enterprises needing multi-entity consolidation, full MRP manufacturers, companies needing payroll/HR at scale, full POS/e-commerce retailers.

## 3. Product principles

1. Time-to-value < 1 day.
2. One connected flow, not siloed modules — devis → commande → BL → facture, no re-typing.
3. Morocco-native, not Morocco-adapted (TVA, ICE/RC/IF, MAD, FR/AR, DGI-readiness from day one).
4. Toggleable modules, shared core.
5. Solo-operable — every decision filtered through "can one dev build/support/evolve this without burning out?"

## 4. MVP scope

### In scope

- Auth & tenancy: sign-up, company/tenant creation, invite teammates, roles (Owner/Admin, Sales, Accountant, Viewer).
- Contacts (CRM core): companies & individuals, tags, notes, timeline, follow-up reminders.
- Sales pipeline: opportunities/leads with stages (New → Qualified → Devis sent → Won/Lost).
- Catalog: products/services, price, unit, TVA rate, stock-tracking flag.
- Commercial document chain: Devis → Commande client → Bon de livraison → Facture, one-click conversion, automatic stock/status updates.
- Purchasing (light): suppliers, purchase orders, goods receipt (updates stock).
- Inventory (light): single/multi-warehouse stock, automatic movements, low-stock alerts.
- Invoicing & payments: sequential legal numbering, partial payments, client ledger, French PDF (Arabic in v1.1).
- Basic accounting/reporting: TVA summary, sales reports, aged receivables, P&L-lite dashboard, CSV/Excel export.
- Compliance-ready invoice data model (UBL/CII + DGI fields stored from day one).
- Multi-language UI: French default + Arabic; English later.
- Dashboard: revenue, open devis, overdue invoices, low stock, pipeline snapshot.

### Out of scope for MVP

- Manufacturing/MRP/BOM/production planning.
- Full payroll/HR (light employee directory only if needed).
- Multi-entity consolidation, multi-currency beyond MAD + one foreign currency.
- Native e-commerce storefront/POS hardware integration.
- Direct live DGI submission (model the data now, wire the API once required — see roadmap).
- Complex approval workflows, advanced BI/analytics, AI features.

## 5. Core personas

- **Aicha**, owner (primary buyer/user) — not technical, wants to stop losing track of who owes what, issue a facture in 2 clicks, see low stock.
- **Youssef**, sole salesperson — simple pipeline, quick devis creation, reminders, mobile-first.
- **The accountant** (external, part-time — common in Morocco) — consumer of exports, not a daily user; needs clean Excel/CSV and TVA summary at month-end.
- **Fatima-Zahra**, ops/inventory (slightly larger shops) — records goods receipt, checks stock quickly.

## 6. Success criteria

- Signup → first invoice in under 30 minutes, unaided.
- Devis → Facture requires zero re-typing of line items.
- Stock stays accurate without manual reconciliation.
- The system produces everything an outsourced accountant needs at month-end.