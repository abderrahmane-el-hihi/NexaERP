"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createDeliveryNoteFromOrder } from "../services/delivery-note.service";
import { TruckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface CreateDeliveryButtonProps {
  salesOrderId: string;
  hasDelivery: boolean;
}

export function CreateDeliveryButton({
  salesOrderId,
  hasDelivery,
}: CreateDeliveryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await createDeliveryNoteFromOrder(salesOrderId);
      router.refresh();
    });
  }

  if (hasDelivery) {
    return (
      <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-1 rounded">
        Delivered (BL)
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="text-blue-700 border-blue-300 hover:bg-blue-50"
    >
      <TruckIcon className="h-3.5 w-3.5 mr-1" />
      {isPending ? "Generating BL..." : "Issue Delivery (BL)"}
    </Button>
  );
}
