"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { previewImport, commitImport } from "../services/csv-importer.service";
import type { ImportEntityType, PreviewImportResult, CommitImportResult } from "../types/importer.types";

interface ImportWizardDialogProps {
  title: string;
  description: string;
  entityType: ImportEntityType;
  sampleCSV: string;
  templateFilename: string;
  headersDescription: string;
  icon?: React.ComponentType<{ className?: string }>;
  triggerLabel?: string;
  onSuccess?: () => void;
}

type WizardStep = "upload" | "preview" | "commit" | "completed";

export function ImportWizardDialog({
  title,
  description,
  entityType,
  sampleCSV,
  templateFilename,
  headersDescription,
  icon: Icon = ArrowUpTrayIcon,
  triggerLabel = "Importer CSV",
  onSuccess,
}: ImportWizardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [isPending, startTransition] = useTransition();

  // Inputs are intentionally EMPTY by default so customers never submit sample data accidentally
  const [csvText, setCsvText] = useState("");
  const [previewData, setPreviewData] = useState<PreviewImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetState() {
    setStep("upload");
    setCsvText("");
    setPreviewData(null);
    setCommitResult(null);
    setErrorMessage(null);
  }

  function handleDownloadTemplate() {
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", templateFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText.trim()) {
      setErrorMessage("Veuillez coller du contenu CSV ou sélectionner un fichier.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await previewImport(entityType, csvText);
        setPreviewData(result);
        setStep("preview");
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erreur inattendue lors de la validation.");
      }
    });
  }

  function handleCommit() {
    if (!previewData || !previewData.isValid) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await commitImport({
          jobId: previewData.jobId,
          commitToken: previewData.commitToken,
          contentHash: previewData.contentHash,
        });
        setCommitResult(result);
        setStep("completed");
        router.refresh();
        onSuccess?.();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erreur lors de l'enregistrement définitif.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="border-border">
            <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
            {triggerLabel}
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </DialogHeader>

        {/* Stepper Header */}
        <div className="flex items-center justify-between border-y border-border py-2 px-1 text-xs text-muted-foreground">
          <div className={`flex items-center gap-1.5 ${step === "upload" ? "font-semibold text-primary" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
            Données
          </div>
          <span className="text-border">→</span>
          <div className={`flex items-center gap-1.5 ${step === "preview" ? "font-semibold text-primary" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
            Validation
          </div>
          <span className="text-border">→</span>
          <div className={`flex items-center gap-1.5 ${step === "commit" ? "font-semibold text-primary" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
            Confirmation
          </div>
          <span className="text-border">→</span>
          <div className={`flex items-center gap-1.5 ${step === "completed" ? "font-semibold text-emerald-600" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">4</span>
            Clôture
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 text-red-950 border border-red-200 text-xs flex items-start gap-2">
            <ExclamationCircleIcon className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <form onSubmit={handlePreview} className="space-y-4">
            <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border text-xs">
              <span className="text-muted-foreground">Télécharger le gabarit type conforme :</span>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-7 text-xs">
                <DocumentArrowDownIcon className="h-3.5 w-3.5 mr-1" />
                Modèle CSV (.csv)
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="csvData" className="text-xs">
                  Contenu CSV (virgule, point-virgule ou tabulation)
                </Label>
                <label className="text-[11px] text-primary hover:underline cursor-pointer">
                  Sélectionner un fichier...
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <textarea
                id="csvData"
                rows={8}
                required
                placeholder={`Collez vos lignes CSV ici...\nColonnes attendues : ${headersDescription}`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Colonnes supportées :</strong> <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{headersDescription}</code>. Les guillemets et séparateurs usuels sont automatiquement interprétés.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !csvText.trim()}>
                {isPending ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  "Analyser et valider"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: PREVIEW */}
        {step === "preview" && previewData && (
          <div className="space-y-4">
            {/* Validation Summary Card */}
            <div
              className={`p-3 rounded-lg text-xs border ${
                previewData.isValid
                  ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                  : "bg-amber-50 text-amber-950 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {previewData.isValid ? (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />
                )}
                <span>
                  {previewData.isValid
                    ? `Fichier validé : ${previewData.validCount} ligne(s) prêtes pour importation.`
                    : `Validation échouée : ${previewData.errorCount} erreur(s) détectée(s) sur ${previewData.totalRows} ligne(s).`}
                </span>
              </div>

              {previewData.financialSummary && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                  <span>Total Débits : <strong>{previewData.financialSummary.totalDebit} MAD</strong></span>
                  <span>Total Crédits : <strong>{previewData.financialSummary.totalCredit} MAD</strong></span>
                  <span className={previewData.financialSummary.isBalanced ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                    {previewData.financialSummary.isBalanced ? "✓ Balance exacte" : "✕ Déséquilibrée"}
                  </span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-yellow-50 text-yellow-950 border border-yellow-200 text-xs space-y-1">
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5 text-yellow-600" />
                  Avertissements (non bloquants) :
                </div>
                <ul className="list-disc list-inside text-[11px] text-yellow-900 max-h-24 overflow-y-auto">
                  {previewData.warnings.map((w, idx) => (
                    <li key={idx}>Ligne {w.row} : {w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors List */}
            {previewData.errors.length > 0 && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-950 border border-red-200 text-xs space-y-1">
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <ExclamationCircleIcon className="h-3.5 w-3.5 text-red-600" />
                  Erreurs à corriger dans votre fichier CSV :
                </div>
                <ul className="list-disc list-inside text-[11px] text-red-900 max-h-36 overflow-y-auto space-y-0.5">
                  {previewData.errors.map((e, idx) => (
                    <li key={idx}>
                      Ligne {e.row} {e.field ? `[${e.field}]` : ""} : {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview sample table */}
            {previewData.previewRows.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Aperçu des données normalisées (10 premières lignes) :</Label>
                <div className="border border-border rounded-lg overflow-x-auto max-h-40">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        {Object.keys(previewData.previewRows[0] || {}).slice(0, 6).map((k) => (
                          <th key={k} className="p-2 capitalize">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewData.previewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          {Object.values(r).slice(0, 6).map((val, vi) => (
                            <td key={vi} className="p-2 truncate max-w-[140px] font-mono text-[10px]">
                              {String(val ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("upload")}>
                ← Modifier le fichier
              </Button>

              {previewData.isValid ? (
                <Button type="button" size="sm" onClick={() => setStep("commit")}>
                  Étape suivante : Confirmer l&apos;importation →
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" disabled>
                  Importation bloquée (erreurs détectées)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: COMMIT CONFIRMATION */}
        {step === "commit" && previewData && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <ShieldCheckIcon className="h-5 w-5 text-primary" />
                Confirmation d&apos;inscription définitive
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Vous êtes sur le point d&apos;inscrire <strong>{previewData.validCount} enregistrement(s)</strong> dans votre base NexaERP.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground">
                <li>Cette opération est enregistrée avec votre identifiant d&apos;utilisateur dans la piste d&apos;audit légale.</li>
                <li>Les mouvements de stock et écritures comptables générés sont strictement verrouillés et immuables.</li>
                <li>En cas de doublon ou d&apos;erreur post-import, les corrections s&apos;effectueront par avoir ou extourne documentée.</li>
              </ul>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("preview")}>
                ← Retour au rapport
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
                disabled={isPending}
                onClick={handleCommit}
              >
                {isPending ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Enregistrement en cours...
                  </>
                ) : (
                  "Confirmer et inscrire les données"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETED */}
        {step === "completed" && commitResult && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                Importation terminée avec succès
              </div>
              <p className="text-emerald-800 leading-relaxed">
                {commitResult.message}
              </p>
              <p className="text-[11px] text-emerald-700 font-mono">
                Identifiant du travail d&apos;audit : {commitResult.jobId}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  resetState();
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
