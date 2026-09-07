# NexaERP Morocco Market and Production Readiness Report

**Audience:** NexaERP founder and leadership team  
**Date:** 7 September 2026  
**Decision:** Whether and how to sell a Morocco-focused SME ERP, and the conditions for a production launch.

## Executive answer

NexaERP has a credible product foundation for a focused Morocco SME offer, but it is **not ready to be marketed as DGI-compliant or put into production as a compliance system**. The codebase has materially improved its accounting and tenancy foundations: real migrations, RLS, decimal money, document lines, an accounting posting path, payment allocations, audit events, valuation layers, tests, and a UBL/sandbox clearance flow are present. The live DGI transport is expressly unimplemented, and current primary-source research did not verify the rollout dates, thresholds, technical contract, accreditation path, or certificate model asserted in the older strategy material. That is a launch blocker, not a detail.

The commercially sound plan is therefore two tracks in parallel:

1. **Sell paid design-partner pilots now** to selected commerce SMEs and accounting firms, using only truthful claims about the features that exist. Position the offer around invoice control, receivables, stock visibility, VAT-ready records, and assisted migration; do not promise legal DGI clearance.
2. **Run a regulatory and integration validation sprint before compliance launch.** Obtain written DGI/operator answers and a real sandbox or operator test path. If direct integration is unavailable, use an approved operator behind the existing clearance port. If no viable route exists, sell an operator/ERP connector or integration service rather than a compliance SaaS.

The first beachhead should be owner-managed wholesalers/distributors in Casablanca-Settat and Rabat-Sale-Kenitra, generally 5-50 employees, one to three stock locations, recurring B2B invoices, and a fiduciaire that will join the pilot. This segment feels stock, cash, collections, and tax pain every week. Do not start with payroll, manufacturing, generic AI, or construction-specific workflows.

## Evidence and uncertainty

### What current primary evidence supports

* OMPIC reported 7,874 new company registrations in January 2026. Of legal persons, 66.7% were SARL AU and 32.4% SARL. Casablanca-Settat, Rabat-Sale-Kenitra, Marrakech-Safi, and Tanger-Tetouan-Al Hoceima represented 77% of legal-person creations. Commerce was the largest sector (27.48%), followed by construction/real estate (25.56%), services (19.14%), transport (8.16%), and industry (6.75%). This supports a geographically focused, commerce-first launch.
* Maroc PME's MOWAKABA digitalisation offer explicitly includes cloud access and IT solutions. Its published page states support of up to 90% for TPE and 80% for PME, but eligibility includes company size, turnover, and industrial or industry-related activity conditions. A subscription must therefore be treated as potentially eligible only after written confirmation for the customer's project.
* The World Bank's 2026 Morocco digital-transformation study identifies a gap in advanced-tech adoption and "incomplete digitalization": firms use tools without integrating them into core operations. This favors a product that improves an entire workflow, not a dashboard or generic AI feature.
* Bank Al-Maghrib notes that cash use remains culturally entrenched and that digital-payment acceptance faces digital-skills, price, and traceability concerns. Cash, cheque, bank transfer, receivables and reconciliation must be first-class workflows.
* CNDP states that ordinary personal-data processing requires notification and that hosting or transmitting personal data abroad requires a transfer request. SaaS production therefore needs a privacy register, CNDP process, data-processing terms, and a deliberate hosting/subprocessor decision.
* DGSSI's guidance says electronic seals are a possible use case for e-invoices, while qualified signatures require qualified certificates and a more demanding security model. This is relevant context, not proof of the DGI invoice mandate's signature requirements.

### What is not verified and must not be sold as fact

The local market strategy's three-wave calendar, the asserted 1 January 2027 SME deadline, a DGI clearance API/UBL requirement, editor accreditation, penalty details, required certificate type, archive duration, and a direct connection path were not found in an authoritative current DGI decree, specification, or API publication in this research pass. Official DGI material establishes that e-invoicing is a strategic programme, but that does not validate an implementation calendar or contract. The app currently exposes these assumptions as settled facts and uses a "Compliance Ready" label; that is a material claims risk.

## Customer and market strategy

### Ideal customer profile

The first ICP is a Moroccan B2B commerce or distribution SME: 5-50 employees; owner-manager buyer; 50-300 invoices/month; 100-2,000 active SKUs; one accountant or office manager; a cabinet comptable involved in VAT/month-end; and enough cash/stock pain to justify more than a simple invoicing tool. Target Casablanca first, then Rabat. Require that the fiduciaire takes part in the evaluation.

Do not prioritise very-low-volume sole traders (the free official option can be a durable price floor), manufacturing (BOM/MRP/traceability), payroll, highly customised construction accounting, or groups needing consolidation. Those are separate products and support models.

### Buyer committee and message

The owner buys control, lower risk, and time. The bookkeeper adopts only when everyday data entry and month-end become easier. The fiduciaire can veto the sale unless exports, VAT figures, audit trail, document completeness, and access are credible.

Lead with: "Keep invoices, stock, payments and VAT records under control in one Moroccan workflow." After regulatory validation, add a narrow, measurable compliance claim such as "submission status monitored through [named approved route]". Never say "DGI compliant" merely because UBL XML is generated.

### Offer architecture

* **Paid design partner:** fixed 90-day pilot for 5-10 customers. Includes assisted migration, founder access, named success milestones, and a contractual statement that legal e-invoice integration is pending validation unless a live approved route exists.
* **Core subscription:** invoice, customer/supplier records, payment terms, receivables, VAT figures, export, standard support. Price annually; retain monthly only as a higher-price exception.
* **Commerce extension:** purchase flow, supplier bills, stock movements, valuation/margin, barcode later, bank-import/reconciliation once reliable.
* **Migration package:** separately priced and scoped; import customers, suppliers, products, open invoices, opening balances, and document scans. Do not bury services labour inside SaaS price.
* **Cabinet programme:** free/internal cabinet licence, multi-client read-only/close workflow when implemented, co-branded onboarding, training, controlled referral share, and contracts directly with the SME.

Pricing from the older strategy (4,800/12,000/24,000 MAD per year) is a hypothesis, not a fact. Test three prices through signed pilot offers. Quote list price, onboarding/migration separately, and a "potential subsidy subject to eligibility" estimate only after Maroc PME confirmation. Do not advertise a customer net price as guaranteed.

## Go-to-market plan

### First 30 days - validate the wedge

1. Obtain written answers from DGI, an approved trust-service provider, and at least two candidate operators/integrators: obligation timing, legal format, authentication/signature/seal, sandbox, certification, archive, operator/editor status, test suite, service levels, and error handling.
2. Interview 20 prospects: 10 cabinets comptables and 10 commerce SMEs. Record invoice volume, current tool, stock locations, payment types, export needs, approval process, migration data quality, willingness to pay, and whether they will introduce a client. Do not ask only opinions; request a paid pilot.
3. Produce a real demo tenant with distributor data, a six-minute owner demo and a 20-minute bookkeeper/cabinet workflow demo.
4. Publish a truthful landing page with an eligibility checker, migration checklist, and request-for-demo/WhatsApp capture. Remove unsupported deadline, fine, subsidy, and "validated/cleared" marketing claims.
5. Secure 3 design-partner agreements with success metrics and data-processing terms.

### Days 31-90 - prove repeatability

* Run weekly pilot reviews. First successful workflow is: import customer/product data -> issue real invoice -> record payment -> show receivable ageing/VAT evidence -> cabinet export. Add stock only when the customer needs it.
* Start a cabinet cohort: 10 firms, one practical workshop each, no generic partner webinar. Success is introductions and active pilots, not signed MOUs.
* Build content around operational questions: rejected/incomplete invoice handling after regulation is verified; serial numbering controls; credit notes; cash/cheque lifecycle; VAT evidence; switching tools mid-year. Avoid generic SEO "ERP Maroc" as the first bet.
* Productise migration and support: template workbooks, preflight validation, error lists, office-hours schedule, WhatsApp response templates, and a named escalation path.

### Channels and economics

The channel thesis is an experiment. Make cabinet-sourced customer share, conversion by cabinet, time-to-first-value, support minutes, and one-year retained revenue visible each month. Keep direct acquisition alive so no cabinet owns a dangerous share of the base. Build partnerships with company-creation/domiciliation services and POS resellers only after the pilot motion is repeatable.

High-touch direct selling cannot be hidden inside a low annual price. A pilot can include founder time deliberately; a recurring plan cannot. Annual billing, explicit migration fees, documentation, guided onboarding, and cabinet level-one support are the economic requirements, not optimisations.

## Product scope and production readiness

### What the system should contain before general availability

**Non-negotiable business core**

* Tenant isolation, users, roles, owner/admin controls, and audited privileged activity.
* Master data: legal entity, customer/supplier, contacts, addresses, products/services, units, taxes, payment terms, chart of accounts.
* Document lifecycle: draft, approval/confirmation, legal numbering, immutable post/void/reversal, credit note, attachments, printable invoices and quotes.
* Financial truth: decimal amounts, balanced posting, accounting periods, VAT calculation and snapshots, AR/AP, allocations, receivables ageing, general ledger/trial balance, VAT export/report, and account/cabinet exports.
* Cash reality: cash, bank transfer, cheque and bounced-cheque states; partial/multiple allocations; bank statement import and reconciliation before promising cash visibility.
* Commerce reality: purchase order, receipt, supplier bill, delivery, invoice; stock movement ledger, valuation, stock count, low-stock/reorder support, product margins. Keep manufacturing and advanced warehouse logic out of V1.
* Adoption: Excel imports with row-level errors, demo data, guided onboarding, help surfaces, French first and architecture ready for Arabic/RTL, responsive web, export/delete/retention processes.

**Compliance system - conditional on written legal/technical confirmation**

* A versioned country ruleset owned by a named compliance owner, not hard-coded dates in UI.
* A real, approved DGI or operator adapter with contract tests, mutually authenticated credentials, signed payload/seal path where required, end-to-end sandbox evidence, idempotency, retry/backoff, reconciliation, rejection explanations, and operator monitoring.
* Immutable original XML/PDF/evidence bundle, hash and timestamps; documented retrieval/retention/destruction policy matching confirmed legal requirements.
* Tenant certificate/seal onboarding with explicit ownership, renewal, revocation, and no private-key exposure to support staff.
* Clear product language: Pending, Submitted, Cleared, Rejected, Needs action, and transport degraded. A local sandbox reference is never called a government clearance reference.

**SaaS and operational core**

* Subscription lifecycle, payment collection/dunning, entitlements, hard/soft limits, invoice/receipt history, cancellation/export flow, and suspension that preserves read/export access.
* Privacy notice, DPA, subprocessor list, CNDP notification/transfer workstream, lawful support access, encryption, secrets rotation, tenant data erasure/retention, backups and restore tests.
* SLOs, uptime/latency/error dashboards, clearance queue monitoring, audit-log review, incident runbooks, on-call/escalation ownership, tested disaster recovery, dependency/SBOM/vulnerability process, access reviews, rate limiting, and independent penetration testing before broad launch.

### Current codebase assessment

The repository supports the positive parts of the revised gap analysis: hardened Prisma migrations include RLS and forced RLS; tests cover accounting, flows, invariants and UBL preflight; the code defines payment allocations and a clearance port. These are meaningful preconditions for an ERP.

The production boundary is nevertheless clear. `DirectDgiAdapter.submit` and `.poll` deliberately throw because the real contract is unknown. The default provider is `SANDBOX`. Therefore no invoice has been submitted to a real DGI or approved operator by this code. A production-compliance claim would be false today.

The public app also has commercial readiness defects found in browser testing: the password-recovery link and the "Corriger et renvoyer" call to action are non-functional; anonymous users can access the onboarding UI even though its final server action rejects unauthenticated provisioning. Fix these before lead generation.

### Stop-ship gates

Do not open general availability until every gate has an accountable owner and evidence:

1. Regulatory evidence pack: official written requirements or signed approved-operator arrangement; legal review; verified date/threshold; certified message contract; test credentials.
2. Real integration evidence: 100+ sandbox/partner tests covering happy path, each validation rejection, timeout, duplicate, retry, cancellation/credit note, certificate expiry, outage and recovery; then named beta tenants under the legally permitted route.
3. Financial integrity evidence: CI gates pass on clean database migrations; invariant suite passes; independent accountant reviews invoice output, postings, VAT and correction paths.
4. Security/privacy evidence: threat model, independent penetration test, secrets/access controls, backup restore within target, incident drill, CNDP documentation and all vendors/subprocessors recorded.
5. Operational evidence: named support model, documented critical incident response, monitoring alerts tested, capacity/load test around period end, and a daily reconciliation/report process.
6. Customer evidence: five paying pilots complete an agreed workflow, at least three cabinet references, activation to first useful invoice below 60 minutes for the intended cohort, and support burden trending below the budget.
7. Commercial evidence: terms, privacy/DPA, subscription/cancellation/refund policy, actual billing/collections process, and no unsupported statements on the landing page or in product UI.

## Metrics and decision rules

Measure weekly: qualified cabinet conversations; cabinet-to-introduction rate; demos; paid pilots; setup completion; time to first useful invoice; import error rate; invoice-to-payment allocation rate; active users by role; support minutes/customer; backlog age; revenue collected; churn; expansion into stock/purchases; and, after real integration, submission success/latency/retry/rejection rates.

Suggested decision thresholds:

* Continue the compliance wedge only if an authorised connection path and test contract exist by the end of the validation sprint.
* Continue the pilot motion only if at least five customers pay, activation is at least 60%, and median setup reaches a useful first invoice without founder intervention.
* Fix product before scaling if support exceeds two hours per active customer per month for two months, or accountants cannot produce their needed exports without manual repair.
* Pivot to an operator connector/integration service if the regulatory gate is unavailable but operators/integrators have installed-base demand.

## Immediate priority list

1. Remove or downgrade unsupported DGI dates, wave labels, compliance-ready labels, clearance references, and subsidy promises in UI/marketing.
2. Assign one founder to regulatory evidence and partner contracting; do not leave it as an engineering research task.
3. Close browser-test defects and protect onboarding navigation.
4. Build the pilot/migration/cabinet workflow before a second horizontal ERP module.
5. Implement subscription billing/collections, bank reconciliation/import, exports, and production operations alongside pilots.
6. Integrate only against an authoritative DGI/approved-operator contract; turn the existing adapter interface into a tested production transport.

## Sources consulted

### Uploaded local planning sources

* ERP-SAAS-BLUEPRINT.md, NexaERP project, reviewed 7 September 2026.
* MARKET-STRATEGY-MOROCCO-2027.md, NexaERP project, reviewed 7 September 2026.
* NEXAERP-GAP-ANALYSIS.md, NexaERP project, reviewed 7 September 2026.

### External sources

* Office Marocain de la Propriete Industrielle et Commerciale. "Creation d'entreprises au Maroc : 7 874 nouvelles entreprises creees en janvier 2026." 27 March 2026. https://www.ompic.ma/fr/actualites/creation-dentreprises-au-maroc-7-874-nouvelles-entreprises-creees-en-janvier-2026
* Maroc PME. "Digitalisation des TPME." Accessed 7 September 2026. https://marocpme.gov.ma/mowakaba-tpme/accompagnement-technique/digitalisation-des-tpme/
* World Bank. "Measuring the Digital Transformation in Morocco." 3 April 2026. https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099040326140018227
* Bank Al-Maghrib. "Rapport annuel sur les systemes et moyens de paiement 2023." https://www.bkam.ma/content/download/813923/8932488/DSSMPIF%202023.pdf
* Commission Nationale de Controle de la Protection des Donnees a Caractere Personnel. "Conditions." Accessed 7 September 2026. https://www.cndp.ma/conditions/
* Direction Generale de la Securite des Systemes d'Information. "FAQ relatif a la loi 43-20." https://www.dgssi.gov.ma/sites/default/files/publications/pdf/2023-03/faq_relatif_a_la_loi_43-20_v1.pdf
* Direction Generale des Impots. "Rapport d'activite 2024" and "Plan strategique 2024-2028." These establish e-invoicing as a strategic programme; they did not provide a verified current mandate contract in this research pass. https://www.finances.gov.ma/Publication/dgi/2025/ra-dgi2024.pdf and https://www.finances.gov.ma/Publication/dgi/2024/plan_strategique_2024_2028.pdf

