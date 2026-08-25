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
import { recordStockAdjustment } from "../services/stock-adjustment.service";
import { ArrowsUpDownIcon, PlusCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface StockAdjustmentDialogProps {
  products: Array<{ id: string; name: string; reference: string | null }>;
  warehouses: Array<{ id: string; name: string }>;
}

export function StockAdjustmentDialog({
  products,
  warehouses,
}: StockAdjustmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [productId, setProductId] = useState(products[0]?.id || "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState(10);
  const [notes, setNotes] = useState("Ajustement d'inventaire manuel (Comptage)");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !warehouseId || quantity <= 0) return;

    startTransition(async () => {
      await recordStockAdjustment({
        productId,
        warehouseId,
        type,
        quantity: Number(quantity),
        notes,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="border-border">
            <ArrowsUpDownIcon className="h-4 w-4 mr-1.5 text-primary" />
            Manual Stock Adjustment
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircleIcon className="h-5 w-5 text-primary" />
            Manual Stock Adjustment (Mouvement de Stock)
          </DialogTitle>
        </DialogHeader>

        {products.length === 0 || warehouses.length === 0 ? (
          <div className="p-4 bg-muted/40 rounded-xl text-xs space-y-2 text-muted-foreground">
            <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
            <p>Please ensure you have created at least one physical product and one warehouse before adjusting stock.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="adjProduct">Product (Article en Stock) *</Label>
              <Select value={productId} onValueChange={(v) => setProductId(v || "")}>
                <SelectTrigger id="adjProduct">
                  <SelectValue placeholder="Select article..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.reference ? `(${p.reference})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjWarehouse">Warehouse (Entrepôt) *</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v || "")}>
                <SelectTrigger id="adjWarehouse">
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adjType">Movement Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT")}>
                  <SelectTrigger id="adjType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Stock Entry (+ IN)</SelectItem>
                    <SelectItem value="OUT">Stock Exit (- OUT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjQty">Quantity *</Label>
                <Input
                  id="adjQty"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjNotes">Reason / Notes</Label>
              <Input
                id="adjNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Inventaire de régularisation, casse..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Recording..." : "Apply Adjustment"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
