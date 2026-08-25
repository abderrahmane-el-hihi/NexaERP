"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/modules/catalog/services/product.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      reference: formData.get("reference") as string,
      type: formData.get("type") as string,
      unit: formData.get("unit") as string || "Piece",
      salesPrice: parseFloat(formData.get("salesPrice") as string),
      purchasePrice: parseFloat(formData.get("purchasePrice") as string),
      tvaRate: parseFloat(formData.get("tvaRate") as string),
      trackStock: formData.get("trackStock") === "on",
    };

    try {
      await createProduct(data);
      router.push("/dashboard/catalog");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create product");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Dell XPS 15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference / SKU</Label>
              <Input id="reference" name="reference" placeholder="e.g. DELL-XPS-15" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Product Type *</Label>
              <select
                id="type"
                name="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="Goods">Goods (Physical)</option>
                <option value="Service">Service</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" defaultValue="Piece" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price (HT) *</Label>
              <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" required defaultValue="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price (HT) *</Label>
              <Input id="salesPrice" name="salesPrice" type="number" step="0.01" required defaultValue="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tvaRate">TVA Rate (%) *</Label>
              <Input id="tvaRate" name="tvaRate" type="number" step="0.1" required defaultValue="20.0" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="trackStock" name="trackStock" defaultChecked className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="trackStock">Track Inventory Stock Levels</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/catalog")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
