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
import { createPurchaseOrder } from "../services/purchase-order.service";
import { PlusIcon, TrashIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface NewPurchaseOrderDialogProps {
  companies: any[];
  products: any[];
}

export function NewPurchaseOrderDialog({
  companies,
  products,
}: NewPurchaseOrderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [lines, setLines] = useState([
    {
      productId: products[0]?.id || "",
      description: products[0]?.name || "Article Fournisseur",
      quantity: 10,
      unitPrice: products[0]?.purchasePrice || 100,
      tvaRate: 20,
    },
  ]);

  function addLine() {
    setLines([
      ...lines,
      {
        productId: products[0]?.id || "",
        description: products[0]?.name || "Nouvel Article",
        quantity: 1,
        unitPrice: products[0]?.purchasePrice || 100,
        tvaRate: 20,
      },
    ]);
  }

  function updateLine(index: number, field: string, value: any) {
    const updated = [...lines];
    if (field === "productId") {
      const selected = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        description: selected?.name || updated[index].description,
        unitPrice: selected?.purchasePrice || updated[index].unitPrice,
        tvaRate: selected?.tvaRate || 20,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLines(updated);
  }

  function removeLine(index: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const tvaAmount = lines.reduce(
    (acc, l) => acc + l.quantity * l.unitPrice * (l.tvaRate / 100),
    0
  );
  const total = subtotal + tvaAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;

    startTransition(async () => {
      await createPurchaseOrder({
        companyId,
        lines,
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
            Create Purchase Order (BC)
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-primary" />
            New Purchase Order / Bon de Commande (BC)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="supplierSelect">Supplier (Fournisseur) *</Label>
            <Select value={companyId} onValueChange={(v) => setCompanyId(v || "")}>
              <SelectTrigger id="supplierSelect">
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.ICE ? `(ICE: ${c.ICE})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="font-semibold text-sm">Order Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2.5 rounded-lg border"
                >
                  <div className="col-span-4">
                    <Select
                      value={line.productId}
                      onValueChange={(v) => updateLine(idx, "productId", v || "")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(idx, "quantity", parseFloat(e.target.value) || 1)
                      }
                      className="h-8 text-xs"
                      placeholder="Qty"
                    />
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs"
                      placeholder="Unit Price"
                    />
                  </div>

                  <div className="col-span-2 text-right text-xs font-semibold">
                    {(line.quantity * line.unitPrice).toLocaleString()} MAD
                  </div>

                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => removeLine(idx)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total HT:</span>
              <span>
                {subtotal.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA (20%):</span>
              <span>
                {tvaAmount.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 border-t pt-1.5">
              <span>Total TTC:</span>
              <span>
                {total.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !companyId}>
              {isPending ? "Creating..." : "Save Purchase Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
