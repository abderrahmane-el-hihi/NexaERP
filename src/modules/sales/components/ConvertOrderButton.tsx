"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertOrderToInvoice } from "../services/invoice.service";
import { ReceiptRefundIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export function ConvertOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await convertOrderToInvoice(orderId);
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <ReceiptRefundIcon className="h-3.5 w-3.5 mr-1" />
      {isPending ? "Invoicing..." : "Create Invoice (FA)"}
    </Button>
  );
}
