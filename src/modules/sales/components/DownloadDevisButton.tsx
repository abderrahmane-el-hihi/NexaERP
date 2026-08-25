"use client";

import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import dynamic from 'next/dynamic';
import { DocumentTemplate } from "./pdf/DocumentTemplate";

// Dynamically import PDFDownloadLink to avoid SSR issues with react-pdf
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled><ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Loading...</Button> }
);

export function DownloadDevisButton({ devis }: { devis: any }) {
  const documentData = {
    type: 'DEVIS' as const,
    number: devis.number,
    date: devis.date,
    validUntil: devis.validUntil,
    company: devis.company,
    tenant: devis.tenant,
    lines: devis.lines,
    subtotal: devis.subtotal,
    tvaAmount: devis.tvaAmount,
    total: devis.total,
  };

  return (
    <PDFDownloadLink
      document={<DocumentTemplate data={documentData} />}
      fileName={`Devis_${devis.number}.pdf`}
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
