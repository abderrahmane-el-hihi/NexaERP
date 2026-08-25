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
import { createSalesOrderDirect } from "../services/order.service";
import { PlusIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface NewSalesOrderDialogProps {
  companies: Array<{ id: string; name: string }>;
}

export function NewSalesOrderDialog({ companies }: NewSalesOrderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [subtotal, setSubtotal] = useState(15000);
  const [tvaRate, setTvaRate] = useState(20);

  const tvaAmount = Math.round(subtotal * (tvaRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tvaAmount) * 100) / 100;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || subtotal <= 0) return;

    startTransition(async () => {
      await createSalesOrderDirect({
        companyId,
        subtotal,
        tvaAmount,
        total,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Sales Order
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-primary" />
            Create Sales Order (Bon de Commande Client)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="orderCustomer">Customer (Client) *</Label>
            <Select value={companyId} onValueChange={(v) => setCompanyId(v || "")}>
              <SelectTrigger id="orderCustomer">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="orderSubtotal">Amount HT (MAD) *</Label>
              <Input
                id="orderSubtotal"
                type="number"
                min="1"
                required
                value={subtotal}
                onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orderTva">TVA Rate (%)</Label>
              <Select
                value={tvaRate.toString()}
                onValueChange={(v) => setTvaRate(parseFloat(v || "20"))}
              >
                <SelectTrigger id="orderTva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20% (Standard)</SelectItem>
                  <SelectItem value="14">14% (Transport / Énergie)</SelectItem>
                  <SelectItem value="10">10% (Restauration / Tourisme)</SelectItem>
                  <SelectItem value="7">7% (Produits de base)</SelectItem>
                  <SelectItem value="0">0% (Exonéré)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs border border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Montant HT:</span>
              <span className="font-mono">{subtotal.toLocaleString()} MAD</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA ({tvaRate}%):</span>
              <span className="font-mono">{tvaAmount.toLocaleString()} MAD</span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
              <span>Total TTC:</span>
              <span className="font-mono text-primary text-sm">{total.toLocaleString()} MAD</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating Order..." : "Confirm & Save Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
