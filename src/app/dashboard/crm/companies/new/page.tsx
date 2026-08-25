"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany } from "@/modules/crm/services/company.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      ICE: formData.get("ICE") as string,
      RC: formData.get("RC") as string,
      IF: formData.get("IF") as string,
      city: formData.get("city") as string,
      address: formData.get("address") as string,
      defaultPaymentTermsDays: parseInt(formData.get("defaultPaymentTermsDays") as string) || 30,
    };

    try {
      await createCompany(data);
      router.push("/dashboard/crm/companies");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create company");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Company</h1>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name (Raison Sociale) *</Label>
              <Input id="name" name="name" required placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                name="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="Client">Client</option>
                <option value="Supplier">Supplier</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ICE">ICE</Label>
              <Input id="ICE" name="ICE" placeholder="15 digits" maxLength={15} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="RC">RC</Label>
              <Input id="RC" name="RC" placeholder="Registry number" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="IF">IF</Label>
              <Input id="IF" name="IF" placeholder="Tax ID" className="font-mono text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="e.g. Casablanca" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTermsDays">Payment Terms (Days)</Label>
              <Input id="defaultPaymentTermsDays" name="defaultPaymentTermsDays" type="number" defaultValue="30" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" placeholder="Full street address" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/crm/companies")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Company"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
