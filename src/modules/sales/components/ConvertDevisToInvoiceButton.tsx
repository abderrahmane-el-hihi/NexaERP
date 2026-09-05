"use client";

import { Button } from "@/components/ui/button";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { convertDevisToInvoice } from "@/modules/sales/services/invoice.service";
import { useRouter } from "next/navigation";
import { messageOf } from "@/shared/errors";

export function ConvertDevisToInvoiceButton({ devisId }: { devisId: string }) {
  const router = useRouter();

  async function handleConvert() {
    if (!confirm("Convert this Devis directly to an Invoice?")) return;
    try {
      await convertDevisToInvoice(devisId);
      alert("Invoice created successfully!");
      router.push("/dashboard/sales/invoices");
    } catch (err: unknown) {
      alert("Error: " + messageOf(err));
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleConvert} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
      <DocumentTextIcon className="h-4 w-4 mr-1" /> Invoice
    </Button>
  );
}
