"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DevisLine {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tvaRate: number;
}

interface DevisLineEditorProps {
  lines: DevisLine[];
  onChange: (lines: DevisLine[]) => void;
  products: any[]; // Replace with correct product type
}

const TVA_RATES = [0, 7, 10, 14, 20];

export function DevisLineEditor({ lines, onChange, products }: DevisLineEditorProps) {
  function addLine() {
    onChange([
      ...lines,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tvaRate: 20,
      },
    ]);
  }

  function removeLine(id: string) {
    onChange(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, field: keyof DevisLine, value: any) {
    onChange(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        
        // If selecting a product, prefill description, price, tva
        if (field === "productId" && value) {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.description = product.name;
            updated.unitPrice = product.salesPrice ?? product.priceHT ?? 0;
            updated.tvaRate = product.tvaRate ?? 20;
          }
        }
        return updated;
      })
    );
  }

  const subtotal = lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice * (1 - l.discount / 100)), 0);
  const totalTVA = lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.tvaRate / 100)), 0);
  const totalTTC = subtotal + totalTVA;

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground w-1/4">Product / Description</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground w-24">Qty</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground w-32">Unit Price</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground w-24">Disc %</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground w-24">TVA %</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground w-32">Total HT</th>
              <th className="px-3 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line) => {
              const lineTotal = line.quantity * line.unitPrice * (1 - line.discount / 100);
              return (
                <tr key={line.id} className="group">
                  <td className="px-3 py-2">
                    <div className="space-y-2">
                      <Select value={line.productId || "__none__"} onValueChange={(v) => updateLine(line.id, "productId", v === "__none__" || v === null ? undefined : v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Custom line...</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        placeholder="Description"
                        className="h-8"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={line.discount}
                      onChange={(e) => updateLine(line.id, "discount", parseFloat(e.target.value) || 0)}
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select value={line.tvaRate.toString()} onValueChange={(v) => updateLine(line.id, "tvaRate", parseInt(v || "20"))}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TVA_RATES.map((r) => (
                          <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">
                    {new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(lineTotal)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeLine(line.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="p-3 border-t border-border bg-muted/20 flex justify-between items-start">
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Line
          </Button>
          
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total HT</span>
              <span>{new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total TVA</span>
              <span>{new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(totalTVA)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Total TTC</span>
              <span>{new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, style: 'currency', currency: 'MAD' }).format(totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
