"use client";

import { TableCellsIcon } from "@heroicons/react/24/outline";
import { ImportWizardDialog } from "./ImportWizardDialog";

const SAMPLE_PRODUCTS_CSV = `Nom,Reference,Type,PrixVente,PrixAchat,TVA,Unite,Categorie,StockInitial
Huile d'Argan Bio 250ml,ARG-250,Bien,140.00,85.00,20,unite,Cosmetique,50
Savon Noir Beldi 500g,SAV-500,Bien,45.00,22.00,20,unite,Hygiene,100
Prestation Conseil Logistique,SRV-LOG,Service,2500.00,0.00,20,heure,Services,0`;

export function ImportProductsDialog() {
  return (
    <ImportWizardDialog
      title="Importation d'articles & services"
      description="Importez vos références articles, prix en dirhams, taux de TVA légaux et reprise de stock initial."
      entityType="Product"
      sampleCSV={SAMPLE_PRODUCTS_CSV}
      templateFilename="modele_import_articles_nexaerp.csv"
      headersDescription="Nom, Reference, Type (Bien/Service), PrixVente, PrixAchat, TVA (0, 7, 10, 14, 20), Unite, Categorie, StockInitial"
      icon={TableCellsIcon}
      triggerLabel="Importer articles (CSV)"
    />
  );
}
