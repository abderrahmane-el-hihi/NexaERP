"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OPT_IN_MODULES } from "@/shared/modules/module-config";
import type { ModuleCode } from "@/shared/modules/module-config";
import { createNewEnterprise } from "@/modules/tenant/services/onboarding.service";
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    ICE: "",
    IF: "",
    RC: "",
    city: "Casablanca",
    address: "",
  });

  const [dataMode, setDataMode] = useState<"clean" | "import" | "demo">("clean");

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
    if (!form.name.trim()) {
      setErrorMsg("Le nom de l'entreprise est obligatoire.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await createNewEnterprise({
          name: form.name,
          ICE: form.ICE,
          IF: form.IF,
          RC: form.RC,
          city: form.city,
          address: form.address,
          enabledModules: ["CRM", "SD", ...enabledModules],
          dataMode,
        });

        if (res.success) {
          router.push("/dashboard");
          router.refresh();
        }
      } catch (err: unknown) {
        console.error("Onboarding error:", err);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue lors de l'initialisation de l'entreprise."
        );
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper-deep)] p-6 relative">
      <div className="w-full max-w-2xl bg-[var(--color-paper)] rounded-[2px] border border-[var(--color-rule)] shadow-sm overflow-hidden">
        {/* Header with step indicator */}
        <div className="p-8 border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[4px] bg-[var(--color-cachet)] flex items-center justify-center shadow-xs">
                <span className="text-white font-bold text-lg leading-none">N</span>
              </div>
              <div>
                <h1 className="font-bold text-xl font-[var(--font-bricolage)] text-[var(--color-ink)]">
                  Configuration de votre entreprise
                </h1>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  NexaERP &bull; Système de gestion conforme aux normes comptables marocaines (CGNC)
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-[4px] font-semibold bg-[var(--color-paper-deep)] border border-[var(--color-rule)] text-[var(--color-ink)]">
              Étape {step} sur 2
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-8 mb-0 p-4 bg-red-50 border border-red-200 rounded-[4px] text-red-900 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Body */}
        <div className="p-8">
          {step === 1 ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) {
                  setErrorMsg("Le nom de l'entreprise (raison sociale) est obligatoire.");
                  return;
                }
                setErrorMsg(null);
                setStep(2);
              }}
            >
              <div>
                <h2 className="text-base font-bold font-[var(--font-bricolage)] text-[var(--color-ink)] mb-1">
                  Identifiants de l&apos;entreprise
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Ces informations apparaîtront sur vos devis, factures et documents officiels. Vous
                  pourrez les ajuster à tout moment dans les paramètres.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="companyName"
                  className="text-sm font-semibold text-[var(--color-ink)] flex items-center justify-between"
                >
                  <span>Raison Sociale (Nom de l&apos;entreprise) *</span>
                </label>
                <input
                  id="companyName"
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ex. Atlas Distribution &amp; Logistique SARL"
                  className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ice" className="text-sm font-medium text-[var(--color-ink)]">
                    ICE (15 chiffres)
                  </label>
                  <input
                    id="ice"
                    value={form.ICE}
                    onChange={(e) => handleChange("ICE", e.target.value)}
                    placeholder="001234567000088"
                    className="font-mono flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                    maxLength={15}
                  />
                  <p className="text-[11px] text-[var(--color-ink-soft)]">Optionnel pour commencer</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="if" className="text-sm font-medium text-[var(--color-ink)]">
                    Identifiant Fiscal (IF)
                  </label>
                  <input
                    id="if"
                    value={form.IF}
                    onChange={(e) => handleChange("IF", e.target.value)}
                    placeholder="12345678"
                    className="font-mono flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                  />
                  <p className="text-[11px] text-[var(--color-ink-soft)]">Optionnel</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="rc" className="text-sm font-medium text-[var(--color-ink)]">
                    Registre de Commerce (RC)
                  </label>
                  <input
                    id="rc"
                    value={form.RC}
                    onChange={(e) => handleChange("RC", e.target.value)}
                    placeholder="87654"
                    className="font-mono flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="city" className="text-sm font-medium text-[var(--color-ink)]">
                    Ville du siège
                  </label>
                  <input
                    id="city"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Casablanca, Rabat, Tanger..."
                    className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="text-sm font-medium text-[var(--color-ink)]">
                  Adresse du siège social
                </label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Boulevard Zerktouni, Casablanca"
                  className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)]"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="h-11 px-6 bg-[var(--color-cachet)] text-white font-bold rounded-[6px] hover:opacity-90 transition-all flex items-center justify-center shadow-xs cursor-pointer gap-2"
                >
                  Continuer vers le mode de démarrage
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold font-[var(--font-bricolage)] text-[var(--color-ink)] mb-1">
                  Mode de démarrage des données
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Choisissez comment vous souhaitez initialiser vos données d&apos;exploitation.
                </p>
              </div>

              {/* Data Mode Radio Cards */}
              <div className="grid grid-cols-1 gap-3">
                {/* 1. Clean */}
                <div
                  onClick={() => setDataMode("clean")}
                  className={`p-4 rounded-[4px] border transition-all cursor-pointer flex items-start gap-3.5 ${
                    dataMode === "clean"
                      ? "border-[var(--color-cachet)] bg-[var(--color-paper-deep)] shadow-xs"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--color-cachet)]/40"
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        dataMode === "clean"
                          ? "border-[var(--color-cachet)] bg-[var(--color-cachet)]"
                          : "border-[var(--color-rule)]"
                      }`}
                    >
                      {dataMode === "clean" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--color-ink)]">
                        Entreprise Vierge (Recommandé)
                      </span>
                      <span className="px-2 py-0.5 rounded-[3px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-semibold">
                        Départ propre
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                      Votre espace est prêt immédiatement. Le plan comptable général marocain
                      (CGNC), les journaux légaux et les taux de TVA sont configurés d&apos;office.
                    </p>
                  </div>
                </div>

                {/* 2. Import */}
                <div
                  onClick={() => setDataMode("import")}
                  className={`p-4 rounded-[4px] border transition-all cursor-pointer flex items-start gap-3.5 ${
                    dataMode === "import"
                      ? "border-[var(--color-cachet)] bg-[var(--color-paper-deep)] shadow-xs"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--color-cachet)]/40"
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        dataMode === "import"
                          ? "border-[var(--color-cachet)] bg-[var(--color-cachet)]"
                          : "border-[var(--color-rule)]"
                      }`}
                    >
                      {dataMode === "import" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--color-ink)]">
                        Importer mes données existantes
                      </span>
                      <span className="px-2 py-0.5 rounded-[3px] bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-semibold">
                        Migration CSV
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                      Importez vos clients, fournisseurs, catalogue d&apos;articles ou balances
                      d&apos;ouverture via l&apos;assistant CSV intégré avec validation RFC-4180.
                    </p>
                  </div>
                </div>

                {/* 3. Demo */}
                <div
                  onClick={() => setDataMode("demo")}
                  className={`p-4 rounded-[4px] border transition-all cursor-pointer flex items-start gap-3.5 ${
                    dataMode === "demo"
                      ? "border-[var(--color-cachet)] bg-[var(--color-paper-deep)] shadow-xs"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--color-cachet)]/40"
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        dataMode === "demo"
                          ? "border-[var(--color-cachet)] bg-[var(--color-cachet)]"
                          : "border-[var(--color-rule)]"
                      }`}
                    >
                      {dataMode === "demo" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--color-ink)]">
                        Mode Démonstration &amp; Découverte
                      </span>
                      <span className="px-2 py-0.5 rounded-[3px] bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold">
                        Jeu d&apos;essai
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                      Explorez l&apos;application avec 1 client marocain exemple, 1 service et 1
                      devis commercial brouillon. Les données d&apos;essai peuvent être purgées à tout
                      moment en un clic.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modules selection */}
              <div className="pt-3 border-t border-[var(--color-rule)]">
                <div className="mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
                    Modules d&apos;entreprise activés
                  </h3>
                  <p className="text-[11px] text-[var(--color-ink-soft)] mt-0.5">
                    CRM, Facturation des ventes et Finance sont inclus par défaut.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {OPT_IN_MODULES.map((mod) => (
                    <div
                      key={mod.code}
                      onClick={() => toggleModule(mod.code, !enabledModules.includes(mod.code))}
                      className={`p-2.5 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between ${
                        enabledModules.includes(mod.code)
                          ? "border-[var(--color-cachet)] bg-[var(--color-paper-deep)]"
                          : "border-[var(--color-rule)] bg-[var(--color-paper)]"
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-xs text-[var(--color-ink)] block">
                          {mod.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-ink-soft)] line-clamp-1">
                          {mod.description}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.includes(mod.code)}
                        onChange={(e) => toggleModule(mod.code, e.target.checked)}
                        className="rounded border-[var(--color-rule)] text-[var(--color-cachet)] focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-rule)] gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="h-11 px-4 border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-deep)] text-[var(--color-ink)] font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Retour
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="h-11 px-6 bg-[var(--color-cachet)] text-white font-bold rounded-[6px] hover:opacity-90 transition-all flex items-center justify-center shadow-xs cursor-pointer gap-2"
                >
                  {isPending ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Initialisation de l&apos;espace...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      Lancer mon espace d&apos;entreprise
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
