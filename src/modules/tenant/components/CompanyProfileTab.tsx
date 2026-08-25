"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTenantProfile } from "../services/tenant.service";
import { BuildingOffice2Icon, CheckIcon, BuildingLibraryIcon, ShieldCheckIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon } from "@heroicons/react/24/outline";

interface CompanyProfileTabProps {
  tenant: any;
}

export function CompanyProfileTab({ tenant }: CompanyProfileTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const extra = tenant.enabledModules || {};

  const [form, setForm] = useState({
    name: tenant.name || "",
    legalName: tenant.legalName || "",
    ICE: tenant.ICE || "",
    RC: tenant.RC || "",
    IF: tenant.IF || "",
    Patente: tenant.Patente || "",
    cnss: extra.cnss || "",
    city: tenant.city || "",
    address: tenant.address || "",
    phone: extra.phone || "",
    email: extra.email || "",
    website: extra.website || "",
    bankName: extra.bankName || "",
    bankRIB: extra.bankRIB || "",
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateTenantProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Information Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BuildingOffice2Icon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Enterprise Profile & General Info</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display / Trade Name *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Atlas Distribution"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="legalName">Corporate / Legal Name (Raison Sociale)</Label>
            <Input
              id="legalName"
              value={form.legalName}
              onChange={(e) => handleChange("legalName", e.target.value)}
              placeholder="e.g. Atlas Distribution & Négoce S.A.R.L"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1">
              <EnvelopeIcon className="h-3.5 w-3.5 text-muted-foreground" /> Contact Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="contact@company.ma"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <PhoneIcon className="h-3.5 w-3.5 text-muted-foreground" /> PhoneIcon Number
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+212 5 22 XX XX XX"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website" className="flex items-center gap-1">
              <GlobeAltIcon className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://company.ma"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" /> City / Ville
            </Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Casablanca, Rabat, Tanger..."
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="address">Headquarters Address (Siège Social)</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Boulevard d'Anfa, Quartier Gauthier"
            />
          </div>
        </div>
      </div>

      {/* Moroccan Legal & Fiscal Identifiers Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-base">Moroccan Legal & Fiscal Identifiers</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
            Article 145 CGI Compliance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ice" className="font-semibold text-xs text-slate-700">
              ICE (15 Digits) *
            </Label>
            <Input
              id="ice"
              value={form.ICE}
              onChange={(e) => handleChange("ICE", e.target.value)}
              placeholder="001234567000088"
              maxLength={15}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Mandatory on all commercial invoices.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="if" className="font-semibold text-xs text-slate-700">
              IF (Identifiant Fiscal) *
            </Label>
            <Input
              id="if"
              value={form.IF}
              onChange={(e) => handleChange("IF", e.target.value)}
              placeholder="12345678"
              maxLength={8}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">8-digit fiscal number from DGI.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rc" className="font-semibold text-xs text-slate-700">
              RC (Registre du Commerce)
            </Label>
            <Input
              id="rc"
              value={form.RC}
              onChange={(e) => handleChange("RC", e.target.value)}
              placeholder="123456 Casablanca"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Tribunal de commerce registration.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="patente" className="font-semibold text-xs text-slate-700">
              Patente / Taxe Pro
            </Label>
            <Input
              id="patente"
              value={form.Patente}
              onChange={(e) => handleChange("Patente", e.target.value)}
              placeholder="34120987"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Professional tax reference.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-1.5">
            <Label htmlFor="cnss" className="text-xs">Numéro CNSS</Label>
            <Input
              id="cnss"
              value={form.cnss}
              onChange={(e) => handleChange("cnss", e.target.value)}
              placeholder="7654321"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Banking & Settlement Details Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-base">Bank Account & Settlement Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank Institution</Label>
            <Input
              id="bankName"
              value={form.bankName}
              onChange={(e) => handleChange("bankName", e.target.value)}
              placeholder="Attijariwafa, BCP, BMCE, CIH, CDM..."
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="bankRIB">Relevé d'Identité Bancaire (RIB - 24 Digits)</Label>
            <Input
              id="bankRIB"
              value={form.bankRIB}
              onChange={(e) => handleChange("bankRIB", e.target.value)}
              placeholder="007 780 0001234567890123 45"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Printed on Devis & Invoices for direct customer wire transfers (virement bancaire).
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckIcon className="h-4 w-4" /> Company profile saved successfully!
          </span>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Company Settings"}
        </Button>
      </div>
    </form>
  );
}
