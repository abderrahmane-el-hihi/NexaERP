"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paySupplierBill } from "../services/purchase-order.service";
import { CreditCardIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface PaySupplierBillDialogProps {
  bill: any;
}

export function PaySupplierBillDialog({ bill }: PaySupplierBillDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState(bill.amountDue || bill.total);
  const [method, setMethod] = useState("Virement Bancaire");
  const [reference, setReference] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    startTransition(async () => {
      await paySupplierBill({
        billId: bill.id,
        amount: Number(amount),
        paymentMethod: method,
        reference,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <CreditCardIcon className="h-3.5 w-3.5 mr-1" />
            Pay Bill
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingLibraryIcon className="h-5 w-5 text-primary" />
            Record Supplier Payment ({bill.number})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="bg-slate-50 p-3.5 rounded-lg border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-semibold">{bill.company?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Bill Amount:</span>
              <span className="font-mono">{bill.total.toLocaleString()} MAD</span>
            </div>
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>Remaining Due:</span>
              <span className="font-mono">{bill.amountDue.toLocaleString()} MAD</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payAmount">Payment Amount (MAD) *</Label>
            <Input
              id="payAmount"
              type="number"
              step="0.01"
              max={bill.amountDue}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payMethod">Payment Method *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v || "Virement Bancaire")}>
              <SelectTrigger id="payMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                <SelectItem value="Chèque">Chèque</SelectItem>
                <SelectItem value="Effet de Commerce (LCN)">Effet de Commerce (LCN)</SelectItem>
                <SelectItem value="Espèces">Espèces (Caisse)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payRef">Bank Ref / Cheque #</Label>
            <Input
              id="payRef"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. VIR-987654 / CHQ-12345"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || amount <= 0}>
              {isPending ? "Posting..." : "Confirm Settlement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
