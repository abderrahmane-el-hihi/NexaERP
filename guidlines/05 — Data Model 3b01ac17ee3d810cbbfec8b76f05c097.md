# 05 — Data Model

Conceptual model to translate into a Prisma schema. Every table is tenant-scoped (tenantId FK) unless marked [global]. Standard fields (id, createdAt, updatedAt, createdBy) apply everywhere.

## 1. Tenancy & Identity

**Tenant**: name, legalName, ICE, RC, IF, Patente, address, city, defaultCurrency (MAD), fiscalYearStart, logo, enabledModules (JSON), subscriptionPlan.

**User**: email, name, passwordHash (if not Clerk), locale (fr/ar), status.

**TenantMembership**: userId, tenantId, role (Owner|Admin|Sales|Accountant|Viewer), invitedAt, acceptedAt.

## 2. CRM

**Contact**: firstName, lastName, email, phone, whatsapp, jobTitle, companyId (nullable), notes.

**Company** (customer/prospect/supplier — distinct from Tenant): name, ICE, IF, address, city, type, defaultPaymentTermsDays, tags.

**Opportunity**: companyId, contactId, title, stage (New|Qualified|DevisSent|Won|Lost), estimatedValue, expectedCloseDate, ownerId.

**Activity**: relatedType/relatedId, type (call|meeting|note|task), dueDate, done, ownerId, content.

## 3. Catalog

**Product**: reference/SKU, name, description, type (good|service), unit, salesPrice, purchasePrice, tvaRate (0|7|10|14|20), trackStock (bool), category.

**PriceList** (optional, 1.x): name, companyId (nullable=default), lines.

## 4. Commercial Document Chain

All four types share header + lines, support conversion to the next stage (copying lines forward, linked via sourceDocumentId/Type).

**Devis**: number (per-tenant sequential), companyId, contactId, opportunityId, date, validUntil, status (Draft|Sent|Accepted|Refused|Expired|ConvertedToOrder), lines[], subtotal, tvaAmount, total, notes.

**DevisLine**: devisId, productId, description, quantity, unitPrice, tvaRate, discountPercent, lineTotal.

**SalesOrder**: number, devisId (nullable), companyId, date, status (Draft|Confirmed|PartiallyDelivered|Delivered|Cancelled), lines[], totals.

**DeliveryNote**: number, salesOrderId, warehouseId, date, status (Draft|Delivered|Cancelled), lines[] (productId, quantityDelivered) — posting creates outbound StockMovements.

**Invoice**: number (strictly sequential per tenant/fiscal year), companyId, salesOrderId/deliveryNoteId, date, dueDate, status (Draft|Finalized|Sent|PartiallyPaid|Paid|Overdue|Cancelled), lines[], subtotal, tvaAmount, total, amountPaid, amountDue. Compliance fields: ublXml, dgiSubmissionStatus (NotApplicable|Pending|Cleared|Rejected), dgiClearanceId, dgiSubmittedAt, dgiClearedAt.

**CreditNote (Avoir)**: number, invoiceId, reason, lines[], total — the only way to correct a finalized invoice.

**Payment**: invoiceId, date, amount, method (cash|chèque|virement|CMI|other), reference, notes.

## 5. Purchasing

**Supplier**: reuse Company with type including supplier for MVP simplicity.

**PurchaseOrder**: number, supplierId, date, status (Draft|Sent|PartiallyReceived|Received|Cancelled), lines[] (productId, quantity, unitCost), total.

**GoodsReceipt**: purchaseOrderId, warehouseId, date, lines[] (productId, quantityReceived) — posting creates inbound StockMovements.

## 6. Inventory

**Warehouse**: name, address, isDefault.

**StockLevel**: productId × warehouseId → quantityOnHand (a projection of StockMovement).

**StockMovement** (immutable ledger, source of truth): productId, warehouseId, quantity (signed), reason (SalesDelivery|PurchaseReceipt|ManualAdjustment|InitialStock), sourceDocumentType/Id, date.

## 7. Accounting (light)

No general ledger/double-entry engine in MVP — reporting over the documents above: TVA summary (collected vs deductible, by period), client ledger/aged receivables, supplier ledger/aged payables (add SupplierInvoice if needed), CSV/Excel export views.

## 8. Reference/global data [global]

TvaRate [global]: 0%, 7%, 10%, 14%, 20% (seed data). City [global]: optional convenience for address dropdowns.

## 9. Relationship summary

Tenant→TenantMembership→User; Tenant→Company→Contact/Opportunity→Activity; Company→Devis→DevisLine→Product; Devis→SalesOrder→DeliveryNote→StockMovement(out); SalesOrder/DeliveryNote→Invoice→Payment; Invoice→CreditNote; Company(supplier)→PurchaseOrder→GoodsReceipt→StockMovement(in); Warehouse→StockLevel/StockMovement.

**Agent guidance:** implement as a Prisma schema with tenantId on every non-global model, indexes on (tenantId, ...) for every lookup path, enums for all status/type fields. Keep StockMovement as the append-only source of truth even if StockLevel is a maintained/materialized table.