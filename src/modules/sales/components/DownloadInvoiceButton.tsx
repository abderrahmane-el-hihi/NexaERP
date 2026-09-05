"use client";

import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import dynamic from 'next/dynamic';
import { DocumentTemplate } from "./pdf/DocumentTemplate";
import type { InvoiceView } from "@/shared/view-types";

// Dynamically import PDFDownloadLink to avoid SSR issues with react-pdf
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled><ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Loading...</Button> }
);

export function DownloadInvoiceButton({ invoice }: { invoice: InvoiceView }) {
  // Since our MVP Invoice model lacks detailed lines, we generate a summary line.
  // In a full implementation, we would map over invoice.lines.
  const summaryLine = {
    description: "Facturation globale (selon devis/commande)",
    quantity: 1,
    unitPrice: invoice.subtotal,
    tvaRate: invoice.subtotal > 0 ? Math.round((invoice.tvaAmount / invoice.subtotal) * 100) : 20,
    discountPercent: 0,
    lineTotal: invoice.subtotal,
  };

  const documentData = {
    type: 'FACTURE' as const,
    number: invoice.number,
    date: invoice.date,
    validUntil: invoice.dueDate ?? undefined,
    company: invoice.company,
    tenant: invoice.tenant,
    lines: [summaryLine],
    subtotal: invoice.subtotal,
    tvaAmount: invoice.tvaAmount,
    total: invoice.total,
  };

  return (
    <PDFDownloadLink
      document={<DocumentTemplate data={documentData} />}
      fileName={`Facture_${invoice.number}.pdf`}
    >
      {/* 
        @ts-ignore 
        react-pdf PDFDownloadLink passes { blob, url, loading, error } as children function
      */}
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
          {loading ? "Preparing PDF..." : "PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
