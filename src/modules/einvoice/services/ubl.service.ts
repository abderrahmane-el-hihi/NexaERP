import { dec } from "@/shared/money";

/**
 * UBL 2.1 invoice generation.
 *
 * Morocco's clearance model requires a structured document (UBL 2.1 or UN/CEFACT CII),
 * not a PDF. The platform validates the ICE, the VAT breakdown and the sequential
 * numbering, so this generator is deliberately strict: it refuses to emit a document
 * that would be rejected, and says which field is at fault.
 */

export interface UblParty {
  name: string;
  ice?: string | null;
  taxId?: string | null; // IF
  rc?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface UblLine {
  position: number;
  description: string;
  quantity: string;
  unitCode: string;
  unitPrice: string;
  lineExtensionAmount: string;
  taxPercent: string;
  taxAmount: string;
}

export interface UblInvoice {
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  currency: string;
  supplier: UblParty;
  customer: UblParty;
  lines: UblLine[];
  taxSubtotals: Array<{ taxableAmount: string; taxAmount: string; percent: string }>;
  lineExtensionAmount: string;
  taxExclusiveAmount: string;
  taxInclusiveAmount: string;
  payableAmount: string;
}

export class UblValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "UblValidationError";
    this.field = field;
  }
}

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Local pre-flight. Everything checked here is something the platform would reject,
 * and finding it before submission is the difference between a fixable form error and
 * an invoice stuck in a queue.
 */
export function validateForClearance(invoice: UblInvoice): void {
  if (!invoice.supplier.ice) {
    throw new UblValidationError("supplier.ice", "L'ICE de votre société est obligatoire");
  }
  if (!invoice.supplier.taxId) {
    throw new UblValidationError("supplier.taxId", "L'identifiant fiscal (IF) est obligatoire");
  }
  if (!invoice.customer.ice) {
    throw new UblValidationError(
      "customer.ice",
      `L'ICE du client "${invoice.customer.name}" est obligatoire pour une facture B2B`
    );
  }
  if (!invoice.number || invoice.number.startsWith("BROUILLON")) {
    throw new UblValidationError("number", "Numéro de facture non attribué");
  }
  if (invoice.lines.length === 0) {
    throw new UblValidationError("lines", "Facture sans ligne");
  }
  if (dec(invoice.payableAmount).lessThanOrEqualTo(0)) {
    throw new UblValidationError("payableAmount", "Le montant total doit être positif");
  }

  const linesTotal = invoice.lines.reduce(
    (acc, l) => acc.plus(dec(l.lineExtensionAmount)),
    dec(0)
  );
  if (!linesTotal.equals(dec(invoice.taxExclusiveAmount))) {
    throw new UblValidationError(
      "taxExclusiveAmount",
      `Le total HT (${dec(invoice.taxExclusiveAmount).toFixed(2)}) ne correspond pas à la somme des lignes (${linesTotal.toFixed(2)})`
    );
  }

  const taxTotal = invoice.taxSubtotals.reduce((acc, s) => acc.plus(dec(s.taxAmount)), dec(0));
  const expected = dec(invoice.taxInclusiveAmount).minus(dec(invoice.taxExclusiveAmount));
  if (!taxTotal.equals(expected)) {
    throw new UblValidationError(
      "taxSubtotals",
      `La TVA déclarée (${taxTotal.toFixed(2)}) ne correspond pas à l'écart TTC-HT (${expected.toFixed(2)})`
    );
  }
}

function party(tag: string, p: UblParty): string {
  return `  <cac:${tag}>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="ICE">${esc(p.ice)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${esc(p.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(p.address)}</cbc:StreetName>
        <cbc:CityName>${esc(p.city)}</cbc:CityName>
        <cac:Country>
          <cbc:IdentificationCode>${esc(p.country ?? "MA")}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(p.taxId)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="RC">${esc(p.rc)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:${tag}>`;
}

export function buildUbl(invoice: UblInvoice): string {
  validateForClearance(invoice);

  const lines = invoice.lines
    .map(
      (l) => `  <cac:InvoiceLine>
    <cbc:ID>${l.position}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${esc(l.unitCode)}">${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${l.lineExtensionAmount}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${invoice.currency}">${l.taxAmount}</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${esc(l.description)}</cbc:Description>
      <cbc:Name>${esc(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:Percent>${l.taxPercent}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${l.unitPrice}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
    )
    .join("\n");

  const subtotals = invoice.taxSubtotals
    .map(
      (s) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${s.taxableAmount}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${s.taxAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${s.percent}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
    )
    .join("\n");

  const taxTotal = invoice.taxSubtotals
    .reduce((acc, s) => acc.plus(dec(s.taxAmount)), dec(0))
    .toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:dgi.gov.ma:facture:1.0</cbc:CustomizationID>
  <cbc:ID>${esc(invoice.number)}</cbc:ID>
  <cbc:IssueDate>${isoDate(invoice.issueDate)}</cbc:IssueDate>
  ${invoice.dueDate ? `<cbc:DueDate>${isoDate(invoice.dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
${party("AccountingSupplierParty", invoice.supplier)}
${party("AccountingCustomerParty", invoice.customer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${taxTotal}</cbc:TaxAmount>
${subtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.lineExtensionAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.taxExclusiveAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.taxInclusiveAmount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.payableAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}
