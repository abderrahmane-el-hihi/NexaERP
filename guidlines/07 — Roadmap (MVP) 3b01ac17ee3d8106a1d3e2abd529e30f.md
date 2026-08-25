# 07 — Roadmap (MVP)

Solo-developer build order. Estimates are order-of-magnitude; re-baseline after Phase 0.

**Phase 0 — Foundation (1–2 weeks):** repo scaffold (Next.js/TS/Tailwind/shadcn), Postgres+Prisma, Docker Compose, auth wired, Tenant/User/TenantMembership + signup→tenant flow, app shell, CI. Exit: signup → create tenant → invite teammate → empty dashboard.

**Phase 1 — CRM Core (1–2 weeks):** Company/Contact/Opportunity/Activity CRUD, pipeline kanban, follow-up reminders job. Exit: scenarios B1–B3 work end to end.

**Phase 2 — Catalog + Sales Document Chain (3–4 weeks, core of the product):** catalog CRUD; Devis creation/PDF/send; Devis→Commande; Commande→BL + stock wiring (build StockMovement/StockLevel here even if Inventory UI comes later); BL/Commande→Facture with numbering + immutability; payments, overdue flagging, credit notes. Exit: full cycle works with correct stock/financial totals and test coverage on conversion/numbering/immutability logic specifically — highest-risk, highest-value code.

**Phase 3 — Purchasing & Inventory UI (1–2 weeks):** suppliers, POs, goods receipt; warehouse mgmt, stock views, low-stock alerts, manual adjustments. Exit: D1–D4 work, stock reconciles against the StockMovement ledger.

**Phase 4 — Accounting & Reporting (1–2 weeks):** TVA summary export, aged receivables/client ledger, sales reports + dashboard charts, reusable CSV/Excel export. Exit: an external accountant could close a month using only this phase's output.

**Phase 5 — Polish, Bilingual, Hardening (2–3 weeks):** Arabic + RTL, PDF template polish, RBAC audit, Sentry + uptime monitoring, onboarding polish (empty states, sample data, first-run checklist). Exit: ready for first real paying tenants.

**Phase 6 — Compliance: DGI E-Invoicing** (timing driven by regulation): build once a real customer's compliance wave approaches, or earlier as a differentiator. UBL/CII XML generation, Simpl-TVA submission integration (async job + retry), status UI. Hard external deadline once customers are in Wave 2/3 (1 Jul 2026 / 1 Jan 2027) — track the official DGI portal, details weren't fully finalized as of mid-2026.

**Phase 7+ — Post-MVP ideas** (not committed): CMI online payment link, multi-currency, WhatsApp Business API, recurring invoices, light employee directory/HR, mobile app.

**Cross-cutting rules:** write tests for money/stock logic as you build, not after; every phase ends demoable; re-check the out-of-scope list before agreeing to anything not on this roadmap — scope creep is the main solo-dev risk.