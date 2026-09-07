"use client";

import { Badge } from "@/components/ui/badge";
import { DocumentCheckIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import type { TenantSettingsData } from "@/modules/tenant/services/tenant.service";

interface ComplianceDGITabProps {
  tenant: TenantSettingsData;
}

export function ComplianceDGITab({ tenant: _tenant }: ComplianceDGITabProps) {
  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DocumentCheckIcon className="h-6 w-6 text-emerald-700" />
              <h2 className="text-lg font-bold text-emerald-950">
                Préparation à la Facturation Électronique Structurée
              </h2>
            </div>
            <p className="text-sm text-emerald-900/80 max-w-3xl leading-relaxed">
              NexaERP structure vos données de facturation (mentions légales, identifiants fiscaux,
              numérotation séquentielle sans rupture et archivage) pour préparer votre entreprise aux
              exigences de traçabilité fiscale et aux futurs raccordements de télé-transmission.
            </p>
          </div>
          <Badge className="bg-emerald-700 text-white font-mono">
            Architecture Prête
          </Badge>
        </div>
      </div>

      {/* Integration Readiness Status */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-base">Statut d&apos;Intégration &amp; Télé-transmission</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Génération UBL 2.1</span>
              <Badge variant="default" className="bg-emerald-600">Actif</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Format XML structuré conforme aux standards internationaux de facturation électronique.
            </p>
            <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
              Génération Locale
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Transport de Télé-transmission</span>
              <Badge variant="secondary">Sandbox</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Simulateur actif. Raccordement direct en attente de publication des contrats et agréments officiels.
            </p>
            <span className="text-[11px] font-mono font-medium text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
              Prêt pour Connecteur
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Contrôle Fiscal &amp; Piste d&apos;Audit</span>
              <Badge variant="default" className="bg-emerald-600">Actif</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Immutabilité des pièces après émission, gestion des avoirs et journal d&apos;audit horodaté.
            </p>
            <span className="text-[11px] font-mono font-medium text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded">
              Invariants Scellés
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <InformationCircleIcon className="h-4 w-4 shrink-0 text-slate-500" />
          <span>
            Les dates d&apos;obligation et modalités de raccordement direct dépendent de la parution des décrets d&apos;application officiels.
          </span>
        </div>
      </div>

      {/* Compliance Architecture Checklist */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-base">Invariants Métier &amp; Rigueur Comptable</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Numérotation Séquentielle Sans Rupture</p>
              <p className="text-xs text-muted-foreground">
                Attribution atomique du numéro de facture dans la transaction de validation (ex. <code>FA-2026-00001</code>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Immutabilité après Émission</p>
              <p className="text-xs text-muted-foreground">
                Une facture émise ne peut être modifiée ni supprimée. Toute correction légale s&apos;opère par Avoir / Note de crédit.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Données Structurées UBL 2.1</p>
              <p className="text-xs text-muted-foreground">
                Chaque facture génère une structure XML normalisée contenant l&apos;ensemble des mentions obligatoires et ventilation de TVA.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Assistance aux Programmes de Digitalisation</p>
              <p className="text-xs text-muted-foreground">
                Assistance au montage des dossiers d&apos;éligibilité pour les programmes d&apos;appui aux TPME (ex. Maroc PME / Mowakaba), sous réserve d&apos;éligibilité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
