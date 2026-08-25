# 01 — Market Research & Benchmark

## 1. Why now: the Moroccan SME context

- SMEs and micro-enterprises (TPE/PME) make up **~98%** of Moroccan companies, ~73% of private-sector employment and ~50% of private value added — but only **~30–35%** use any digital management tool beyond Excel, and **under 10%** use an actual ERP.
- Most Moroccan SMEs today run on **Excel + WhatsApp + paper/shared binders**. This breaks down as they grow: lost quotes, forgotten follow-ups, wrong stock counts, no reliable reporting.
- Three forces pushing structuring in 2026: data volume (10,000+ docs/year for a 20-person company, ~30% of time lost searching without a GED), mandatory e-invoicing (the biggest forcing function), and Loi 09-08/CNDP enforcement.
- A structured Moroccan SME needs four blocks: ERP, CRM, document management (GED), and cybersecurity/compliance baseline. Nexa-ERP owns the first two fully, touches the others lightly.
- Concrete asks: quotes/devis, purchase orders, delivery notes (bons de livraison), stock, purchasing, accounting in one consistent flow, plus online payment (CMI) and a WhatsApp contact link.

## 2. The e-invoicing shock (biggest requirement)

Morocco is rolling out mandatory, government-cleared electronic invoicing under Article 145 CGI, via the 2026 Finance Act:

- **Model:** "Clearance" model (like Mexico, Turkey, Saudi Arabia) — every invoice must be validated by the DGI (via the **Simpl-TVA** platform) before it has legal value. Only structured **UBL 2.1** or **UN/CEFACT CII** XML is accepted — not PDF.
- **Flow:** Issue (structured XML) → Submit to DGI → DGI validates, returns clearance ID → Validated invoice sent to client → Archived both sides.
- **Rollout waves** (verify against official DGI portal):
    - Wave 1 — 1 Jan 2026: large companies (CA > 200M MAD) + public-sector suppliers
    - Wave 2 — 1 Jul 2026: mid-sized companies (CA 10M–200M MAD)
    - Wave 3 — 1 Jan 2027: SMEs/TPE (CA < 10M MAD) and self-employed (CA > 500,000 MAD)
- **Penalties:** 500 MAD/non-compliant invoice (capped 50,000 MAD/year); from 2027 non-compliant invoices may lose tax-deductibility.
- **Subsidy:** MOWAKABA can cover up to 90% of transition cost for TPEs.
- **Implication:** by the time Nexa-ERP reaches most target customers (Wave 3), e-invoicing is table stakes, not a differentiator. Design the invoice data model now; add DGI submission later without a schema rewrite.

## 3. Competitive benchmark

| Product | Model | Strength | Weakness for our target |
| --- | --- | --- | --- |
| Odoo | Per-user SaaS ($7.25–$76+/user/mo) or self-hosted | Huge ecosystem, polished UI, strong Moroccan integrator network | Expensive per-user; 8–12 week implementation even in the fast case; overkill breadth |
| SAP Business One | Perpetual (~$3,200/user) or cloud ($99–176/user/mo) | Deep industry templates, enterprise credibility | Too expensive/slow (4–8 months) for a Moroccan TPE/PME |
| ERPNext (Frappe) | Free self-hosted or ~$50+/mo, not per-user | Full breadth, flat pricing model | Steep learning curve, weaker support |
| Dolibarr | Free/open-source, ~$14/mo hosted | Very lightweight, installs in an afternoon, low learning curve | Not a "real" ERP (no MRP), dated UI, no formal support |
| Crystal ERP (Moroccan) | Local SaaS | Built for DGI e-invoicing, Moroccan support, full commercial cycle in one flow | Closed/proprietary, limited public pricing info |
| Sage Business Cloud | SaaS, accounting-first | Strong accounting core | Weaker CRM/sales pipeline |

### Positioning takeaways

1. Fill the gap: Dolibarr's simplicity + ERPNext's flat pricing + Crystal ERP's Moroccan/DGI-native compliance + a modern UI (none of the above have one).
2. Don't compete on breadth — win on setup speed (<1 day), non-technical usability, native FR/AR + MAD + Moroccan tax fields, credible DGI path.
3. Flat/tiered pricing (not aggressive per-user) is what growing SMEs prefer.
4. Buying triggers: e-invoicing deadline pressure, accountant asking for clean records, a lost/duplicated order, hiring a first salesperson.

## 4. Concrete feature needs

- Devis → Bon de commande → Bon de livraison → Facture, chained without re-entry.
- Stock tied to sales/purchasing (auto in/out).
- Basic accounting: TVA (20% standard + reduced rates), client/supplier ledgers, accountant-friendly export.
- CRM: pipeline, contacts, follow-up reminders (the #1 named pain: "relances oubliées").
- Multi-language: French primary, Arabic secondary.
- ICE / RC / IF / Patente fields.
- Online payment (CMI) + WhatsApp link.
- Structured e-invoicing (DGI clearance).

## 5. Sources

Maroc PME/ANPME (Wikipedia); CRYSTAL IT ([crystalit.ma](http://crystalit.ma)); deadLine agency; NexaDigit; Efficience Expertise; OasisTechnoCloud; EDICOM Group; Upsilon Consulting; Karizma Group; [vatcalc.com](http://vatcalc.com); SelectHub; Cudio; ERP Implementation EU; Dasolo; Octura Solutions; Prospeo.