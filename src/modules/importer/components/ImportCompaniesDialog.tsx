"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { ImportWizardDialog } from "./ImportWizardDialog";

const SAMPLE_COMPANIES_CSV = `Nom,Type,ICE,IF,RC,Ville,Adresse,Telephone,Email,ContactPrenom,ContactNom
Safi Ciments SA,Fournisseur,001889977000033,40129988,998877,Safi,Zone Industrielle,+212524621122,contact@saficiments.ma,Karim,Bennani
Maghreb Industrie SARL,Client,002998811000044,55443322,443322,Casablanca,Boulevard d'Anfa,+212522998877,commandes@maghreb-ind.ma,Fatima,Zahra`;

export function ImportCompaniesDialog() {
  return (
    <ImportWizardDialog
      title="Importation de tiers (Clients & Fournisseurs)"
      description="Intégrez votre portefeuille de clients et fournisseurs avec contrôle syntaxique de l'ICE et détection de doublons."
      entityType="Company"
      sampleCSV={SAMPLE_COMPANIES_CSV}
      templateFilename="modele_import_tiers_nexaerp.csv"
      headersDescription="Nom, Type, ICE, IF, RC, Ville, Adresse, Telephone, Email, ContactPrenom, ContactNom"
      icon={BuildingOffice2Icon}
      triggerLabel="Importer tiers (CSV)"
    />
  );
}
