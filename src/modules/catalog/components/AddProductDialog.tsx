"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createProduct } from "@/modules/catalog/services/product.service";

export function AddProductDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    reference: "",
    description: "",
    type: "good",
    unit: "unit",
    salesPrice: 0,
    purchasePrice: 0,
    tvaRate: 20,
    trackStock: true,
  });

  function handleChange(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createProduct({
        name: form.name,
        reference: form.reference || undefined,
        description: form.description || undefined,
        type: form.type,
        unit: form.unit,
        salesPrice: Number(form.salesPrice),
        purchasePrice: Number(form.purchasePrice),
        tvaRate: Number(form.tvaRate),
        trackStock: form.trackStock,
      });
      setOpen(false);
      setForm({
        name: "",
        reference: "",
        description: "",
        type: "good",
        unit: "unit",
        salesPrice: 0,
        purchasePrice: 0,
        tvaRate: 20,
        trackStock: true,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Item to Catalog</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={form.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => handleChange("type", v || "good")}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good (Physical)</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => handleChange("unit", v || "unit")}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">Unit (U)</SelectItem>
                  <SelectItem value="hour">Hour (h)</SelectItem>
                  <SelectItem value="day">Day (j)</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="m">Meter (m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salesPrice">Sales Price (HT)</Label>
              <Input
                id="salesPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.salesPrice}
                onChange={(e) => handleChange("salesPrice", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Cost (HT)</Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => handleChange("purchasePrice", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tvaRate">TVA Rate (%)</Label>
              <Select
                value={form.tvaRate.toString()}
                onValueChange={(v) => handleChange("tvaRate", parseInt(v || "20"))}
              >
                <SelectTrigger id="tvaRate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="14">14%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="7">7%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="trackStock"
              checked={form.trackStock}
              onCheckedChange={(c: boolean) => handleChange("trackStock", c)}
            />
            <Label htmlFor="trackStock" className="cursor-pointer">
              Track stock levels for this item
            </Label>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.name}>
              {isSubmitting ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
