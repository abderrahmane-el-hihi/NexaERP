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
import { updateProduct } from "../services/product.service";
import { PencilSquareIcon, CubeIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { ProductView } from "@/shared/view-types";

interface EditProductDialogProps {
  product: ProductView;
}

export function EditProductDialog({ product }: EditProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(product.name || "");
  const [reference, setReference] = useState(product.reference || "");
  const [salesPrice, setSalesPrice] = useState(product.salesPrice || 0);
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice || 0);
  const [tvaRate, setTvaRate] = useState(product.tvaRate?.toString() || "20");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      await updateProduct(product.id, {
        name,
        reference,
        salesPrice: Number(salesPrice),
        purchasePrice: Number(purchasePrice),
        tvaRate: parseFloat(tvaRate),
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 h-7 px-2">
            <PencilSquareIcon className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-primary" />
            Edit Product / Service
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="editName">Designation (Nom) *</Label>
            <Input
              id="editName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editRef">Reference (Code Article)</Label>
            <Input
              id="editRef"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="editSalesPrice">Sales Price HT (MAD)</Label>
              <Input
                id="editSalesPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editPurchasePrice">Cost Price HT (MAD)</Label>
              <Input
                id="editPurchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editTva">Moroccan TVA Rate (%)</Label>
            <Select value={tvaRate} onValueChange={(v) => setTvaRate(v || "20")}>
              <SelectTrigger id="editTva">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20% (Standard)</SelectItem>
                <SelectItem value="14">14% (Transport / Énergie)</SelectItem>
                <SelectItem value="10">10% (Tourisme / Restauration)</SelectItem>
                <SelectItem value="7">7% (Produits de base)</SelectItem>
                <SelectItem value="0">0% (Exonéré)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
