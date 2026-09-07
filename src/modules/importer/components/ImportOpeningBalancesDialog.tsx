"use client";

import { ScaleIcon } from "@heroicons/react/24/outline";
import { ImportWizardDialog } from "./ImportWizardDialog";

const SAMPLE_BALANCE_CSV = `CodeCompte,Debit,Credit,Libelle
1111,0.00,100000.00,Capital social
2340,50000.00,0.00,Matériel de transport
3111,20000.00,0.00,Stock de marchandises initial
3421,15000.00,0.00,Créances clients reportées
4411,0.00,25000.00,Dettes fournisseurs reportées
5141,40000.00,0.00,Banque (solde initial)`;

export function ImportOpeningBalancesDialog() {
  return (
    <ImportWizardDialog
      title="Importation du bilan d'ouverture"
      description="Intégrez votre balance d'ouverture avec contrôle strict de l'égalité Débits = Crédits en Decimal et validation du plan comptable."
      entityType="OpeningBalance"
      sampleCSV={SAMPLE_BALANCE_CSV}
      templateFilename="modele_import_balance_ouverture_nexaerp.csv"
      headersDescription="CodeCompte (ex: 1111, 3421, 5141), Debit, Credit, Libelle"
      icon={ScaleIcon}
      triggerLabel="Importer bilan d'ouverture (CSV)"
    />
  );
}
