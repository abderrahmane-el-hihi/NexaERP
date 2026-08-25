# 08 — Morocco Compliance Requirements

Legally load-bearing: treat every requirement here as a hard constraint, even for parts implemented later. **Verify current details against the official DGI portal (Simpl-TVA) before going live** — the implementing decree was still being finalized as of mid-2026.

## 1. Legal identifiers

Every Tenant and every Company should store: **ICE** (Identifiant Commun de l'Entreprise, required on invoices), **RC** (Registre de Commerce), **IF** (Identifiant Fiscal), **Patente**, and (later, if payroll is ever added) CNSS number. These must appear on generated Devis/Commande/BL/Facture PDFs.

## 2. TVA (VAT) handling

Standard rate **20%**; reduced rates commonly cited: 7%, 10%, 14%; plus 0%/exempt for specific cases. Every Product and document line needs an explicit TVA rate — don't assume one rate per tenant. Invoices must show subtotal, TVA grouped by rate, and total. The TVA summary report is what lets a business file its periodic TVA declaration — accuracy is non-negotiable.

## 3. Sequential invoice numbering

Invoice numbers must be sequential and gapless within a tenant's fiscal year. Allocate the number inside the same DB transaction that finalizes the invoice, using a per-tenant per-fiscal-year counter with row-level locking to avoid races. Cancelling an invoice doesn't free its number — Cancelled is a status, the number stays in sequence.

## 4. Immutability & correction via Avoir

Once Finalized, a Facture's lines/totals/date are read-only (enforced in the service layer). Corrections go through a CreditNote (Avoir) referencing the original — never a silent edit/delete. This is also a precondition for e-invoicing: a DGI-cleared invoice can't be un-cleared by an app-side edit.

## 5. Mandatory electronic invoicing (DGI "clearance" model)

**What it is:** legal basis Article 145 (145-IX) CGI, operationalized by the 2026 Finance Act. Clearance model (same family as Mexico/Turkey/Saudi Arabia) — an invoice only has legal value after DGI validation. Accepted formats: **UBL 2.1** or **UN/CEFACT CII** structured XML — not PDF, not a scan. Platform: **Simpl-TVA**, run by DGI (microservices architecture per public reporting), piloted late 2025.

**Flow (Phase 6):** Issue (generate XML from stored invoice fields) → Submit to Simpl-TVA API → Validate (DGI checks format/data/signature/coherence, issues a clearance ID) → Transmit the cleared invoice to the client (this, not your own PDF, is the legally valid document) → Archive both sides.

**Rollout timeline** (verify against the official portal):

| Wave | Effective date | Who |
| --- | --- | --- |
| 1 | 1 Jan 2026 | Large companies, CA > 200M MAD, + public-sector suppliers |
| 2 | 1 Jul 2026 | Mid-sized, CA 10M–200M MAD |
| 3 | 1 Jan 2027 | SMEs/TPE (CA < 10M MAD) and self-employed (CA > 500,000 MAD) |

**Product implication:** most Nexa-ERP customers fall in Wave 3 (1 Jan 2027) — real runway to ship the core product first and land e-invoicing well ahead of the deadline, but the data model is built for it from day one so it's additive later, not a rewrite.

**Penalties:** 500 MAD/non-compliant invoice (capped 50,000 MAD/year); from 2027, non-compliant invoices may lose tax-deductibility (bigger risk than the fixed penalty — useful for sales conversations). MOWAKABA subsidy can cover up to 90% of a TPE's transition cost.

**Phase 6 build checklist:**

- Natively generates UBL 2.1/CII XML from invoice data (no manual re-entry)
- Connects to Simpl-TVA for submission, displays DGI responses (cleared/rejected + reason)
- Near-real-time validation status on the invoice
- Isolated/versioned XML-generation logic (/modules/compliance) so regulatory updates don't require a full redeploy
- Retries transient failures without duplicate submissions (idempotency key per invoice)
- Clear "Pending DGI validation" UI state

## 6. Data protection (Loi 09-08 / CNDP)

Enforced by CNDP, increased audits since 2024. Practical MVP steps: encrypt at rest/in transit, don't over-collect Contact PII, allow data export/delete on request, keep a basic access log for sensitive records. Not MVP-blocking, but note it in settings/legal early.

## 7. Language

French is the default working language for Moroccan B2B software/accounting; Arabic (with RTL) should be supported by v1.1 at the latest — a market-fit expectation, not just a nice-to-have.