"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createCompany } from "@/modules/crm/services/company.service";
import { useRouter } from "next/navigation";

export function AddCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    type: "prospect",
    ICE: "",
    IF: "",
    RC: "",
    city: "",
    address: "",
    defaultPaymentTermsDays: "30",
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.type) return;

    startTransition(async () => {
      await createCompany({
        name: form.name,
        type: form.type,
        ICE: form.ICE || undefined,
        IF: form.IF || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        defaultPaymentTermsDays: parseInt(form.defaultPaymentTermsDays) || 30,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Company
        </Button>
      } />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="ACME SARL"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v || "")}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Casablanca"
              />
            </div>
          </div>

          {/* Moroccan Legal Identifiers */}
          <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Moroccan Legal Identifiers
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ice" className="text-xs">ICE</Label>
                <Input
                  id="ice"
                  value={form.ICE}
                  onChange={(e) => handleChange("ICE", e.target.value)}
                  placeholder="001234567000012"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="if" className="text-xs">IF</Label>
                <Input
                  id="if"
                  value={form.IF}
                  onChange={(e) => handleChange("IF", e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc" className="text-xs">RC</Label>
                <Input
                  id="rc"
                  value={form.RC || ""}
                  onChange={(e) => handleChange("RC", e.target.value)}
                  placeholder="234567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Rue Mohammed V, Casablanca"
            />
          </div>

          {/* Payment Terms */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentTerms">Default Payment Terms (days)</Label>
            <Select
              value={form.defaultPaymentTermsDays}
              onValueChange={(v) => handleChange("defaultPaymentTermsDays", v || "")}
            >
              <SelectTrigger id="paymentTerms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Cash on delivery</SelectItem>
                <SelectItem value="15">15 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Add Company"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
