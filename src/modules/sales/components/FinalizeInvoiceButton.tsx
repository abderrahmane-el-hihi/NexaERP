"use client";

import { Button } from "@/components/ui/button";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { updateInvoice } from "@/modules/sales/services/invoice.service";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/shared/errors";

export function FinalizeInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);

  async function handleFinalize() {
    if (!confirm("Are you sure you want to finalize this invoice? This will post it to the General Ledger and lock it from future edits.")) return;
    
    setIsFinalizing(true);
    try {
      await updateInvoice(invoiceId, { status: "Finalized" });
      router.refresh();
    } catch (err: unknown) {
      alert("Error: " + messageOf(err));
      setIsFinalizing(false);
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleFinalize} 
      disabled={isFinalizing}
      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
    >
      <LockClosedIcon className="h-4 w-4 mr-1" /> {isFinalizing ? "Locking..." : "Finalize"}
    </Button>
  );
}
