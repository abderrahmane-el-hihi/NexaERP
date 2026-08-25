"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCommercialSettings } from "../services/tenant.service";
import { ReceiptRefundIcon, CheckIcon, CalculatorIcon, ClockIcon, DocumentTextIcon, TagIcon } from "@heroicons/react/24/outline";

interface CommercialSettingsTabProps {
  tenant: any;
}

export function CommercialSettingsTab({ tenant }: CommercialSettingsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const extra = tenant.enabledModules || {};

  const [form, setForm] = useState({
    defaultCurrency: tenant.defaultCurrency || "MAD",
    defaultTva: extra.defaultTva !== undefined ? Number(extra.defaultTva) : 20,
    defaultPaymentTerms: extra.defaultPaymentTerms !== undefined ? Number(extra.defaultPaymentTerms) : 30,
    defaultDevisValidity: extra.defaultDevisValidity !== undefined ? Number(extra.defaultDevisValidity) : 15,
    invoiceFooterNote: extra.invoiceFooterNote || "SARL au capital de 100.000 DH — RC Casablanca — IF 12345678 — ICE 001234567000088",
    dgiWave: extra.dgiWave || "Wave3",
  });

  function handleChange(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateCommercialSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Financial & Tax Defaults */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <CalculatorIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Currency & Moroccan Tax (TVA) Defaults</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">Default Currency (Devise Principale)</Label>
            <Select
              value={form.defaultCurrency}
              onValueChange={(v) => handleChange("defaultCurrency", v || "MAD")}
            >
              <SelectTrigger id="defaultCurrency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAD">MAD — Dirham Marocain (د.م.)</SelectItem>
                <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Standard base currency for accounting ledger.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultTva" className="flex items-center gap-1">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" /> Standard TVA Rate (%)
            </Label>
            <Select
              value={form.defaultTva.toString()}
              onValueChange={(v) => handleChange("defaultTva", parseInt(v || "20"))}
            >
              <SelectTrigger id="defaultTva">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20% — Standard Rate (Taux Normal)</SelectItem>
                <SelectItem value="14">14% — Transports & Électricité</SelectItem>
                <SelectItem value="10">10% — Restauration & Hôtellerie</SelectItem>
                <SelectItem value="7">7% — Eau, Fournitures, Produits de base</SelectItem>
                <SelectItem value="0">0% — Exonéré / Export (Art. 92 CGI)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Pre-selected rate when adding catalog products.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dgiWave">DGI E-Invoicing Rollout Wave</Label>
            <Select
              value={form.dgiWave}
              onValueChange={(v) => handleChange("dgiWave", v || "Wave3")}
            >
              <SelectTrigger id="dgiWave">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wave1">Wave 1 — 1 Jan 2026 (CA &gt; 200M MAD)</SelectItem>
                <SelectItem value="Wave2">Wave 2 — 1 Jul 2026 (CA 10M–200M MAD)</SelectItem>
                <SelectItem value="Wave3">Wave 3 — 1 Jan 2027 (TPE/PME &lt; 10M MAD)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Sets government clearance enforcement date.</p>
          </div>
        </div>
      </div>

      {/* Commercial Terms & Validity */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ClockIcon className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold text-base">Payment Terms & Validity Defaults</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="paymentTerms">Default Payment Terms (Délais de paiement)</Label>
            <Select
              value={form.defaultPaymentTerms.toString()}
              onValueChange={(v) => handleChange("defaultPaymentTerms", parseInt(v || "30"))}
            >
              <SelectTrigger id="paymentTerms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Paiement Comptant / À la livraison</SelectItem>
                <SelectItem value="15">15 jours nets</SelectItem>
                <SelectItem value="30">30 jours nets (Standard commercial)</SelectItem>
                <SelectItem value="60">60 jours nets (Loi délais de paiement)</SelectItem>
                <SelectItem value="90">90 jours fin de mois</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Default due date applied when finalizing invoices.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="devisValidity">Default Devis Validity (Durée de validité)</Label>
            <Select
              value={form.defaultDevisValidity.toString()}
              onValueChange={(v) => handleChange("defaultDevisValidity", parseInt(v || "15"))}
            >
              <SelectTrigger id="devisValidity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="15">15 jours (Recommandé)</SelectItem>
                <SelectItem value="30">30 jours (1 mois)</SelectItem>
                <SelectItem value="60">60 jours (2 mois)</SelectItem>
                <SelectItem value="90">90 jours (3 mois)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Auto-populates the validity date on quotes.</p>
          </div>
        </div>
      </div>

      {/* Invoice & Document Footer Notes */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <DocumentTextIcon className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-base">Legal Mentions & Document Footer Notice</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoiceFooterNote">Commercial Document Footer (Pied de page des Factures / Devis)</Label>
          <Textarea
            id="invoiceFooterNote"
            rows={3}
            value={form.invoiceFooterNote}
            onChange={(e) => handleChange("invoiceFooterNote", e.target.value)}
            placeholder="SARL au capital de ... — RC ... — IF ... — ICE ... — Patente ... — RIB ..."
          />
          <p className="text-[11px] text-muted-foreground">
            Printed at the bottom of generated PDF documents (Devis, Commandes, Bons de Livraison, Factures).
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckIcon className="h-4 w-4" /> Commercial preferences saved!
          </span>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Commercial Settings"}
        </Button>
      </div>
    </form>
  );
}
