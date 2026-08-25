"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { OPT_IN_MODULES } from "@/shared/modules/module-config";
import type { ModuleCode } from "@/shared/modules/module-config";
import { createNewEnterprise } from "@/modules/tenant/services/onboarding.service";
import { BuildingOffice2Icon, RectangleStackIcon, CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon, SparklesIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    ICE: "",
    IF: "",
    RC: "",
    city: "Casablanca",
    address: "",
  });

  const [enabledModules, setEnabledModules] = useState<ModuleCode[]>([
    "MM",
    "INV",
    "FI",
    "COMP",
    "DOC",
  ]);

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleModule(code: ModuleCode, checked: boolean) {
    if (checked) {
      setEnabledModules((prev) => [...prev, code]);
    } else {
      setEnabledModules((prev) => prev.filter((m) => m !== code));
    }
  }

  function handleComplete() {
    if (!form.name.trim()) return;

    startTransition(async () => {
      await createNewEnterprise({
        name: form.name,
        ICE: form.ICE,
        IF: form.IF,
        RC: form.RC,
        city: form.city,
        address: form.address,
        enabledModules: ["CRM", "SD", ...enabledModules],
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 p-4">
      <div className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* Top Progress Banner */}
        <div className="bg-primary text-primary-foreground px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                N
              </div>
              <h1 className="font-bold text-lg tracking-tight">NexaERP Enterprise Onboarding</h1>
            </div>
            <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-medium">
              Step {step} of 2
            </span>
          </div>
          <p className="text-xs text-primary-foreground/80 mt-2">
            {step === 1
              ? "Configure your Moroccan legal entity credentials."
              : "Select active enterprise modules and launch your workspace."}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {step === 1 ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.name.trim()) setStep(2);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Enterprise Legal Name (Raison Sociale) *</Label>
                <Input
                  id="companyName"
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Maroc Distribution &amp; Logistique SARL"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ice">ICE (15 Chiffres)</Label>
                  <Input
                    id="ice"
                    value={form.ICE}
                    onChange={(e) => handleChange("ICE", e.target.value)}
                    placeholder="001234567000088"
                    className="font-mono text-xs"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="if">IF (Identifiant Fiscal)</Label>
                  <Input
                    id="if"
                    value={form.IF}
                    onChange={(e) => handleChange("IF", e.target.value)}
                    placeholder="12345678"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rc">RC (Registre de Commerce)</Label>
                  <Input
                    id="rc"
                    value={form.RC}
                    onChange={(e) => handleChange("RC", e.target.value)}
                    placeholder="87654"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City (Ville du Siège)</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Casablanca, Rabat, Tanger..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address (Adresse du Siège)</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Boulevard Zerktouni, Casablanca"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="w-full sm:w-auto px-6">
                  Continue to Modules
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Select Active Modules</h3>
                <p className="text-xs text-muted-foreground">
                  CRM, Sales Invoicing (SD), and Finance (FI) are included by default. Toggle additional capabilities below.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {OPT_IN_MODULES.map((mod) => (
                  <div
                    key={mod.code}
                    onClick={() => toggleModule(mod.code, !enabledModules.includes(mod.code))}
                    className={`flex items-start space-x-3 p-3.5 border rounded-xl transition-all cursor-pointer ${
                      enabledModules.includes(mod.code)
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      id={mod.code}
                      checked={enabledModules.includes(mod.code)}
                      onCheckedChange={(checked: boolean) => toggleModule(mod.code, checked)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5 leading-none">
                      <Label htmlFor={mod.code} className="font-bold text-sm cursor-pointer text-foreground">
                        {mod.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  {isPending ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Provisioning Workspace...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Launch Enterprise Workspace
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
