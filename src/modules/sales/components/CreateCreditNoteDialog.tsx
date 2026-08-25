"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCreditNoteFromInvoice } from "../services/credit-note.service";
import { ArrowUturnLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface CreateCreditNoteDialogProps {
  invoice: any;
}

export function CreateCreditNoteDialog({ invoice }: CreateCreditNoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [reason, setReason] = useState("Retour marchandise / Annulation légale");
  const [restockGoods, setRestockGoods] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      await createCreditNoteFromInvoice({
        invoiceId: invoice.id,
        reason,
        restockGoods,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50">
            <ArrowUturnLeftIcon className="h-3.5 w-3.5 mr-1" />
            Issue Avoir
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-900">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            Issue Credit Note / Facture d'Avoir
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="bg-red-50/70 p-3.5 rounded-lg border border-red-200 text-xs space-y-1 text-red-950">
            <p className="font-semibold">
              Finalized Invoice: <span className="font-mono">{invoice.number}</span>
            </p>
            <p>Customer: {invoice.company?.name}</p>
            <p className="font-semibold text-sm pt-1">
              Credit Amount: {invoice.total.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
            </p>
            <p className="text-[11px] text-red-800 pt-1">
              Under Moroccan CGI, finalized invoices cannot be edited. Issuing an Avoir legally reverses
              the General Ledger entry and cancels the AR client liability.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reasonInput">Reason for Credit Note (Motif de l'Avoir) *</Label>
            <Input
              id="reasonInput"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Marchandise endommagée, Erreur de facturation..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="restock"
              checked={restockGoods}
              onCheckedChange={(c: boolean) => setRestockGoods(c)}
            />
            <label htmlFor="restock" className="text-xs font-medium cursor-pointer">
              Automatically restock items into warehouse inventory (StockMovement IN)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? "Issuing..." : "Confirm & Post Avoir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
