"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentTextIcon, ArrowLeftIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { DevisLineEditor, type DevisLine } from "@/modules/sales/components/DevisLineEditor";
import { createDevis } from "@/modules/sales/services/devis.service";
import type { CompanyView, OpportunityView, ProductView } from "@/shared/view-types";

interface NewDevisPageProps {
  companies: CompanyView[];
  opportunities: OpportunityView[];
  products: ProductView[];
}

export default function NewDevisPage({ companies, opportunities, products }: NewDevisPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    companyId: "",
    opportunityId: "__none__",
    validUntil: "",
    notes: "",
  });
  
  const [lines, setLines] = useState<DevisLine[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, discount: 0, tvaRate: 20 }
  ]);

  function handleChange(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId || lines.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const subtotal = lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice * (1 - l.discount / 100)), 0);
      const totalTVA = lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.tvaRate / 100)), 0);
      
      await createDevis({
        companyId: form.companyId,
        opportunityId: form.opportunityId === "__none__" ? undefined : form.opportunityId,
        validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
        notes: form.notes || undefined,
      }, lines.map(({ id, ...line }) => line));
      
      router.push("/dashboard/sales/devis");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sales/devis">
            <Button type="button" variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-primary" />
              New Devis
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Create a commercial proposal.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/sales/devis">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || !form.companyId}>
            <DocumentCheckIcon className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "DocumentCheckIcon Devis"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold border-b border-border pb-3">Client Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company">Company *</Label>
                <Select value={form.companyId} onValueChange={(v) => handleChange("companyId", v || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="opportunity">Related Opportunity</Label>
                <Select value={form.opportunityId} onValueChange={(v) => handleChange("opportunityId", v || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {opportunities.filter(o => !form.companyId || o.companyId === form.companyId).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold pl-1">Line Items</h2>
            <DevisLineEditor lines={lines} onChange={setLines} products={products} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold border-b border-border pb-3">Details</h2>
            
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={form.validUntil}
                onChange={(e) => handleChange("validUntil", e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / Conditions</Label>
              <textarea
                id="notes"
                className="w-full flex min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Payment terms, delivery time..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
