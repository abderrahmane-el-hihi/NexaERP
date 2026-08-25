"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { convertDevisToOrder } from "@/modules/sales/services/order.service";
import { useRouter } from "next/navigation";

export function ConvertDevisButton({ devisId }: { devisId: string }) {
  const router = useRouter();

  async function handleConvert() {
    if (!confirm("Convert this Devis to a Sales Order?")) return;
    try {
      await convertDevisToOrder(devisId);
      alert("Order created successfully!");
      router.push("/dashboard/sales/orders");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleConvert}>
      <ArrowRightIcon className="h-4 w-4 mr-1" /> Order
    </Button>
  );
}
