import { notFound } from "next/navigation";
import { getInvoice } from "@/modules/sales/services/invoice.service";
import PrintTrigger from "./PrintTrigger"; // A small client component

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Invoices carry their own lines now, so the printed document is the document —
  // no more reaching back through the sales order to the quotation to guess at content.
  const invoice = await getInvoice(id);
  if (!invoice) return notFound();

  const lines = invoice.lines ?? [];

  // Formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: invoice.tenant.defaultCurrency || 'MAD' }).format(amount);
  };
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  return (
    <div className="max-w-[210mm] mx-auto p-12 bg-white min-h-[297mm]">
      <PrintTrigger />
      
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{invoice.tenant.name}</h1>
          <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{invoice.tenant.address}</p>
          <p className="text-sm text-slate-500">{invoice.tenant.city}, Maroc</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-slate-300 tracking-widest uppercase">Facture</h2>
          <p className="text-sm font-semibold mt-2 text-slate-700">N° {invoice.number}</p>
          <p className="text-sm text-slate-500">Date: {formatDate(invoice.date || invoice.createdAt)}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-12">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Facturé à</h3>
        <p className="font-bold text-lg text-slate-800">{invoice.company.name}</p>
        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{invoice.company.address}</p>
        <p className="text-sm text-slate-600">{invoice.company.city}</p>
        {invoice.company.ICE && <p className="text-xs text-slate-500 mt-2">ICE: {invoice.company.ICE}</p>}
      </div>

      {/* Lines Table */}
      <table className="w-full text-sm text-left mb-12">
        <thead>
          <tr className="border-b-2 border-slate-800 text-slate-800">
            <th className="py-3 font-semibold w-1/2">Description</th>
            <th className="py-3 font-semibold text-center">Qté</th>
            <th className="py-3 font-semibold text-right">Prix Unitaire</th>
            <th className="py-3 font-semibold text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr className="border-b border-slate-200">
              <td className="py-4 text-slate-700">Prestations de services / Marchandises</td>
              <td className="py-4 text-center text-slate-700">1</td>
              <td className="py-4 text-right text-slate-700">{formatCurrency(invoice.subtotal)}</td>
              <td className="py-4 text-right font-medium text-slate-900">{formatCurrency(invoice.subtotal)}</td>
            </tr>
          ) : (
            lines.map((line) => (
              <tr key={line.id} className="border-b border-slate-200">
                <td className="py-4 text-slate-700">{line.description}</td>
                <td className="py-4 text-center text-slate-700">{line.quantity}</td>
                <td className="py-4 text-right text-slate-700">{formatCurrency(line.unitPrice)}</td>
                <td className="py-4 text-right font-medium text-slate-900">{formatCurrency(line.lineTotal)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-1/2">
          <div className="flex justify-between py-2 text-sm text-slate-600">
            <span>Total HT</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm text-slate-600 border-b border-slate-200">
            <span>TVA</span>
            <span>{formatCurrency(invoice.tvaAmount)}</span>
          </div>
          <div className="flex justify-between py-4 text-lg font-bold text-slate-900">
            <span>Total TTC</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer Legal Info */}
      <div className="mt-24 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
        <p className="font-semibold text-slate-500">{invoice.tenant.name}</p>
        <p className="mt-1">
          {invoice.tenant.ICE && `ICE: ${invoice.tenant.ICE} • `}
          {invoice.tenant.RC && `RC: ${invoice.tenant.RC} • `}
          {invoice.tenant.IF && `IF: ${invoice.tenant.IF} • `}
          {invoice.tenant.Patente && `Patente: ${invoice.tenant.Patente}`}
        </p>
      </div>
    </div>
  );
}
