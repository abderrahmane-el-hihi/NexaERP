# Runbook d'Onboarding & Activation Pilote — NexaERP

Ce document constitue le guide opérationnel officiel destiné aux spécialistes du déploiement, chargés d'affaires et ingénieurs support guidant les PME marocaines lors de leur intégration sur la plateforme NexaERP.

---

## 1. Vue d'Ensemble & Objectifs Pilote

L'onboarding de NexaERP a été conçu selon trois principes cardinaux :
1. **Rigueur financière & conformité marocaine (CGNC) :** Chaque entreprise dispose dès la première seconde d'un plan comptable complet, de journaux légaux et des taux de TVA officiels (0%, 7%, 10%, 14%, 20%).
2. **Isolation stricte des tenants (RLS) :** Aucune donnée inter-entreprises ne fuite ; les droits d'accès sont verrouillés au niveau Postgres via `withTenant()`.
3. **Activation progressive et observable :** La complétion de l'onboarding repose sur des comptages effectifs en base de données (pas de faux statuts ni d'affirmations de certification non auditées).

---

## 2. Parcours Opérationnel Étape par Étape

```
[ Inscription / Signup ]
         │
         ▼
[ Provisionnement Idempotent User ]
         │
         ▼
[ Configuration Entreprise (Étape 1) ]
   - Raison Sociale (Obligatoire)
   - ICE, IF, RC, Ville, Adresse (Non-bloquants)
         │
         ▼
[ Choix du Mode de Données (Étape 2) ]
   ├── Option 1 : Entreprise Vierge (Recommandé)
   ├── Option 2 : Importation de Données CSV (Clients, Articles, Balances)
   └── Option 3 : Mode Démonstration (Jeu d'essai purgé en 1 clic)
         │
         ▼
[ Déploiement Espace de Travail ]
   - Création Tenant + Warehouse par défaut
   - Seeding COA CGNC + Journaux + Périodes
   - Seeding éventuel des données démo étiquetées
         │
         ▼
[ Dashboard & Checklist d'Activation (6 Jalons Réels) ]
```

---

## 3. Détail des Étapes & Bonnes Pratiques

### Étape 1 : Création de Compte & Authentification
- **Champs requis :** Nom de l'entreprise ($\ge 2$ caractères), adresse email professionnelle valide, mot de passe ($\ge 8$ caractères).
- **Idempotence :** L'action serveur `provisionPlatformUser` utilise `upsert` avec `withPlatformBypass` afin de concilier Supabase Auth et Prisma sans risque de collision ou de doublon.
- **Gestion des emails existants :** Si l'email est déjà enregistré, l'utilisateur est réorienté vers la page de connexion avec une notification claire en français.

### Étape 2 : Identité Légale de l'Entreprise
- **Raison sociale :** Nom légal de l'entreprise marocaine (ex. *Atlas Distribution & Logistique SARL*).
- **Identifiants légaux :**
  - **ICE :** 15 chiffres. Fortement recommandé pour la facturation conforme mais **non-bloquant** pour explorer l'application ou créer un premier brouillon.
  - **IF :** Identifiant Fiscal (généralement 8 chiffres).
  - **RC :** Registre de Commerce et Ville du tribunal compétent.
  - **Adresse du siège social.**
- **Idempotence :** La fonction `createNewEnterprise` vérifie d'abord si l'utilisateur possède déjà un tenant actif en tant que `Owner`. Si oui, elle renvoie ce tenant sans créer d'entité orpheline.

### Étape 3 : Sélection du Mode de Démarrage des Données
Le spécialiste onboarding doit orienter le client vers l'un des trois modes :
1. **Entreprise Vierge (Clean) :**
   - *Pour qui :* Entreprises créant une nouvelle activité ou souhaitant repartir de zéro.
   - *Résultat :* Base vide de partenaires et d'articles. Plan comptable marocain CGNC provisionné, prêt pour les écritures.
2. **Importer des données (Import) :**
   - *Pour qui :* PME migrant depuis Sage, Ciel, Excel ou un ERP tiers.
   - *Procédure :* Accompagner le client vers l'assistant d'importation CSV (`ImportWizardDialog`) pour charger :
     - Le carnet de clients / fournisseurs (avec contrôle de format ICE).
     - Le catalogue d'articles / services (avec contrôle des doublons de références).
     - La balance d'ouverture comptable (avec vérification obligatoire de l'équilibre Débit = Crédit via `postOpeningBalancesEntry`).
3. **Mode Démonstration (Demo) :**
   - *Pour qui :* Évaluation commerciale, formation des équipes ou période d'essai.
   - *Données injectées :* 1 client d'exemple (*Société Atlas Distribution SARL*), 1 prestation de service (*Pack Conseil & Digitalisation*), et 1 devis commercial brouillon (*DEV-DEMO-0001*).
   - *Purge sans risque :* Toutes les entités démo portent des marqueurs explicites (`tags: ["demo"]`, `category: "DEMO"`, notes contenant `[DEMO]`). Un bouton dans la bannière du dashboard permet de purger 100% de ces données en un clic sans toucher au plan comptable.

---

## 4. Checklist d'Activation (Tableau de Bord)

Dès l'accès au tableau de bord, une bannière de suivi affiche 6 jalons calculés **exclusivement depuis les requêtes réelles en base de données** :

| Jalon | Intitulé | Condition en Base de Données | Action de Guidage |
| :--- | :--- | :--- | :--- |
| **1** | **Identité entreprise** | `tenant.name` et (`tenant.ICE` ou `tenant.city`) | Lien vers `/dashboard/settings` |
| **2** | **Import données** | `ImportJob (Completed) > 0` OU `dataImportSkipped` OU `isDemo` | Lien vers l'assistant d'import ou bouton "Passer l'étape" |
| **3** | **Premier client** | `Company` de type `customer` ou `both` $> 0$ | Lien vers `/dashboard/crm/companies` |
| **4** | **Catalogue articles** | `Product` actif $> 0$ | Lien vers `/dashboard/catalog` |
| **5** | **Première facture/devis**| `Invoice` $> 0$ OU `Devis` $> 0$ | Lien vers `/dashboard/sales/invoices` |
| **6** | **Premier paiement** | `Payment` enregistré $> 0$ | Lien vers `/dashboard/sales/payments` |

---

## 5. Résolution d'Incidents (Troubleshooting)

### Incident A : L'utilisateur a cliqué deux fois sur "Lancer l'espace"
- **Comportement attendu :** L'action est idempotente. La transaction ou le contrôle de membership existant intercepte la double soumission et renvoie l'ID du tenant déjà provisionné.
- **Vérification support :**
  ```sql
  SELECT "tenantId", "userId", "role" FROM "TenantMembership" WHERE "userId" = '<user_uuid>';
  ```
  Le résultat ne doit contenir qu'une seule ligne d'appartenance `Owner`.

### Incident B : Le client souhaite supprimer les données de démo après sa formation
- **Procédure :** L'utilisateur clique sur "Purger les données d'essai" sur le dashboard.
- **Garantie :** Seuls les devis, articles et clients portant le tag/catégorie démo sont supprimés. Les comptes comptables 1 à 7 restent intacts.

### Incident C : Statut de la Télé-déclaration DGI
- **Rappel strict de conformité :** `DirectDgiAdapter` demeure non opérationnel (`status: NotApplicable`). Ne jamais prétendre à un client que la transmission directe à la DGI est active en production avant la phase d'homologation légale officielle.
