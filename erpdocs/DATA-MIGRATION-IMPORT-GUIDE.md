# Guide Opérateur : Migration & Importation de Données (NexaERP)

Ce document décrit la procédure opérationnelle standard pour l'importation de données de démarrage lors du déploiement de NexaERP chez des clients pilotes marocains.

---

## 1. Principes Fondamentaux de Sécurité & d'Isolation

1. **Architecture en Deux Phases (Prévisualisation $\rightarrow$ Engagement)** :
   - **Phase 1 (Validation)** : L'analyseur vérifie la syntaxe, la conformité aux schémas Zod, l'absence de doublons et l'équilibre comptable. **Aucun enregistrement métier (tiers, article, stock, écriture comptable) n'est créé en base lors de cette phase.** Un travail `ImportJob` horodaté et haché (SHA-256) est généré à l'état `Validated` ou `Failed`.
   - **Phase 2 (Confirmation)** : Seul un travail validé peut être engagé à l'aide de son jeton de confirmation à usage unique (`commitToken`). L'opération s'exécute dans une transaction atomique avec verrouillage de concurrence.
2. **Idempotence Stricte** :
   - Un ré-envoi accidentel d'un même jeton d'engagement renvoie le résultat d'origine sans dupliquer les tiers, les articles, les stocks ou les écritures.
3. **Piste d'Audit & Traçabilité** :
   - Chaque opération est signée avec l'identifiant réel de l'utilisateur connecté (`userId`).
   - Toutes les créations transitent par les services de domaine canoniques (`createCompany`, `createProduct`, `applyMovement`, `postEntry`). Les écritures directes non auditées sont formellement proscrites.
4. **Intégrité Monétaire & Comptable** :
   - Les calculs et cumuls sont réalisés en `Decimal` sans aucune approximation flottante (tolérance zéro).
   - Les écritures comptables générées dans le journal des opérations diverses (`OD`) sont immuables.

---

## 2. Gabarits Types et Formats Supportés

Les fichiers peuvent être délimités par des **virgules (`,`)**, des **points-virgules (`;`)** ou des **tabulations (`\t`)**. L'encodage recommandé est **UTF-8** (avec ou sans BOM). Les champs contenant des séparateurs ou des sauts de ligne doivent être entourés de guillemets doubles (`"..."`).

### A. Répertoire des Tiers (Clients & Fournisseurs)
- **Fichier type** : `modele_import_tiers_nexaerp.csv`
- **En-têtes acceptés (FR ou EN)** :
  `Nom`, `Type`, `ICE`, `IF`, `RC`, `Ville`, `Adresse`, `Telephone`, `Email`, `ContactPrenom`, `ContactNom`
- **Règles de validation & conflits** :
  - `Nom` : Obligatoire, non vide.
  - `Type` : `Client` (`Customer`), `Fournisseur` (`Supplier`), ou `Partenaire` (`Partner`).
  - `ICE` : Contrôle de format syntaxique strict à 15 chiffres (`^\d{15}$`) si renseigné. *Rappel : ce contrôle est purement syntaxique et ne constitue pas une attestation de validité fiscale DGI.*
  - **Gestion des doublons** : Un ICE présent plusieurs fois dans le fichier bloque l'importation. Si l'ICE existe déjà en base pour ce tenant, un avertissement explicite est affiché dans le rapport de prévisualisation.

```csv
Nom,Type,ICE,IF,RC,Ville,Adresse,Telephone,Email,ContactPrenom,ContactNom
Safi Ciments SA,Fournisseur,001889977000033,40129988,998877,Safi,Zone Industrielle,+212524621122,contact@saficiments.ma,Karim,Bennani
Maghreb Industrie SARL,Client,002998811000044,55443322,443322,Casablanca,Boulevard d'Anfa,+212522998877,commandes@maghreb-ind.ma,Fatima,Zahra
```

---

### B. Catalogue d'Articles & Services (avec Stock Initial)
- **Fichier type** : `modele_import_articles_nexaerp.csv`
- **En-têtes acceptés (FR ou EN)** :
  `Nom`, `Reference`, `Type`, `PrixVente`, `PrixAchat`, `TVA`, `Unite`, `Categorie`, `StockInitial`
- **Règles de validation & conflits** :
  - `Reference` : Obligatoire et unique au sein du catalogue du tenant. Une référence déjà existante bloque la validation.
  - `Type` : `Bien` (`good`) ou `Service` (`service`).
  - `PrixVente` / `PrixAchat` : Décimaux positifs ou nuls.
  - `TVA` : Taux autorisés au Maroc uniquement : `0`, `7`, `10`, `14`, `20` (en %).
  - `StockInitial` : Réservé aux articles de type `Bien`. Si un stock initial est spécifié, il est automatiquement valorisé et enregistré via le moteur de stock canonique (`applyMovement`), avec mise à jour du niveau de stock, couche de valorisation (`ValuationLayer`) et imputation au journal des stocks (`STK`) selon la politique d'inventaire.

```csv
Nom,Reference,Type,PrixVente,PrixAchat,TVA,Unite,Categorie,StockInitial
Huile d'Argan Bio 250ml,ARG-250,Bien,140.00,85.00,20,unite,Cosmetique,50
Savon Noir Beldi 500g,SAV-500,Bien,45.00,22.00,20,unite,Hygiene,100
Prestation Conseil Logistique,SRV-LOG,Service,2500.00,0.00,20,heure,Services,0
```

---

### C. Bilan d'Ouverture / Balance de Clôture N-1
- **Fichier type** : `modele_import_balance_ouverture_nexaerp.csv`
- **En-têtes acceptés (FR ou EN)** :
  `CodeCompte`, `Debit`, `Credit`, `Libelle`
- **Règles de validation & conflits** :
  - **Égalité stricte Débits = Crédits** : La somme exacte des débits doit être rigoureusement égale à la somme des crédits en `Decimal` (tolérance = 0,00 MAD). Tout écart bloque immédiatement la validation.
  - **Conformité au Plan Comptable Marocain (CGNC)** : Chaque compte doit exister au préalable dans le plan comptable du tenant (`tx.account`). **Le système n'invente jamais de compte avec un type par défaut.** Tout compte inconnu est rejeté avec indication du numéro de compte manquant.
  - **Statut de la période** : L'exercice comptable cible ne doit pas être clôturé (`Closed`).
  - **Imputation** : Enregistrée sous forme d'écriture immuable dans le journal des Opérations Diverses (`OD`), liée au `ImportJob` d'audit.

```csv
CodeCompte,Debit,Credit,Libelle
1111,0.00,100000.00,Capital social
2340,50000.00,0.00,Matériel de transport
3111,20000.00,0.00,Stock de marchandises initial
3421,15000.00,0.00,Créances clients reportées
4411,0.00,25000.00,Dettes fournisseurs reportées
5141,40000.00,0.00,Banque (solde initial)
```

---

## 3. Procédure de Rétablissement et d'Extourne (Rollback)

1. **Avant Confirmation (Phase de Prévisualisation)** :
   - Aucun enregistrement de production n'étant écrit en phase 1, fermer la fenêtre ou annuler l'importation ne laisse aucun résidu dans les tables métier. Le `ImportJob` reste simplement en statut `Draft` ou `Failed` pour l'historique d'audit.
2. **Échec en Cours d'Engagement (Transaction Rollback)** :
   - Si une erreur réseau ou d'intégrité survient pendant la phase de commit, la transaction de base de données est intégralement annulée (`ROLLBACK`). Aucun tiers, article ou ligne d'écriture orpheline n'est persisté.
3. **Correction Post-Confirmation** :
   - Conformément aux règles d'immutabilité financière de NexaERP :
     - Les écritures comptables postées ne sont jamais supprimées. Pour corriger un bilan d'ouverture erroné après validation, l'opérateur doit passer une écriture d'extourne (reversal) documentée dans le journal des opérations diverses.
     - Les ajustements de stocks s'effectuent par inventaire physique ou mouvement de régularisation documenté.
     - Les fiches tiers ou articles erronées peuvent être archivées (`isActive: false`) ou mises à jour via leurs interfaces dédiées.
