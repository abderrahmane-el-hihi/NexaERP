"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  confirmPurchaseOrder,
  receiveGoodsFromPO,
  createSupplierBillFromPO,
} from "../services/purchase-order.service";
import { CheckCircleIcon, PlusCircleIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface PurchaseOrderActionsProps {
  order: any;
}

export function PurchaseOrderActions({ order }: PurchaseOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await confirmPurchaseOrder(order.id);
      router.refresh();
    });
  }

  function handleReceive() {
    startTransition(async () => {
      await receiveGoodsFromPO(order.id);
      router.refresh();
    });
  }

  function handleCreateBill() {
    startTransition(async () => {
      await createSupplierBillFromPO(order.id);
      router.refresh();
    });
  }

  const hasReceipt = order.receipts && order.receipts.length > 0;
  const hasBill = order.bills && order.bills.length > 0;

  return (
    <div className="flex items-center justify-end gap-2">
      {order.status === "Draft" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleConfirm}
          disabled={isPending}
          className="text-amber-700 border-amber-300 hover:bg-amber-50"
        >
          <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
          Confirm PO
        </Button>
      )}

      {(order.status === "Confirmed" || order.status === "Draft") && !hasReceipt && (
        <Button
          size="sm"
          onClick={handleReceive}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <PlusCircleIcon className="h-3.5 w-3.5 mr-1" />
          Receive Goods (BR)
        </Button>
      )}

      {hasReceipt && !hasBill && (
        <Button
          size="sm"
          onClick={handleCreateBill}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
          Generate Bill (FF)
        </Button>
      )}

      {hasBill && (
        <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-1 rounded">
          Bill: {order.bills[0]?.number}
        </span>
      )}
    </div>
  );
}
