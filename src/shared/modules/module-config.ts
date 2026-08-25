/**
 * Module configuration — mirrors the 09-module-catalog.md specification.
 * Each module has a stable code (like SAP FI/CO/SD/MM) used in:
 *   - Tenant.enabledModules JSON field
 *   - Sidebar navigation filtering
 *   - Feature-gate checks
 */

export type ModuleCode = "CRM" | "SD" | "MM" | "INV" | "FI" | "COMP" | "DOC";

export interface ModuleDefinition {
  code: ModuleCode;
  name: string;
  description: string;
  /** Always-on modules cannot be disabled by the tenant */
  alwaysOn: boolean;
  /**
   * COMP activates automatically when tenant's DGI wave date is reached.
   * MM + INV are opt-in for tenants that hold physical stock.
   */
  optIn: boolean;
}

export const MODULES: Record<ModuleCode, ModuleDefinition> = {
  CRM: {
    code: "CRM",
    name: "Customer Relationship",
    description:
      "Stop losing track of prospects, clients, and follow-ups. Companies, contacts, opportunities, activities.",
    alwaysOn: true,
    optIn: false,
  },
  SD: {
    code: "SD",
    name: "Sales & Distribution",
    description:
      "The commercial engine. Devis → Commande → Bon de livraison → Facture → Payment.",
    alwaysOn: true,
    optIn: false,
  },
  MM: {
    code: "MM",
    name: "Purchasing",
    description:
      "Manage supplier orders and goods receipts. Opt-in for businesses that hold physical stock.",
    alwaysOn: false,
    optIn: true,
  },
  INV: {
    code: "INV",
    name: "Inventory & Warehouse",
    description:
      "Real-time stock levels driven by an append-only StockMovement ledger. Multi-warehouse ready.",
    alwaysOn: false,
    optIn: true,
  },
  FI: {
    code: "FI",
    name: "Finance & Accounting",
    description:
      "TVA summary, aged receivables, client ledger, and sales reports for the external accountant.",
    alwaysOn: true,
    optIn: false,
  },
  COMP: {
    code: "COMP",
    name: "Compliance & E-Invoicing",
    description:
      "Moroccan DGI e-invoicing (Simpl-TVA). Activates automatically when tenant's wave date arrives.",
    alwaysOn: false,
    optIn: false, // auto-activated by wave date, not manual opt-in
  },
  DOC: {
    code: "DOC",
    name: "Document Attachments",
    description:
      "Attach files (signed devis, ID copies, contracts) to any record via Supabase Storage.",
    alwaysOn: true, // shared capability, not a toggle
    optIn: false,
  },
};

/** Modules the tenant can manually enable/disable during onboarding */
export const OPT_IN_MODULES = Object.values(MODULES).filter((m) => m.optIn);

/** Modules that are always on for every tenant */
export const ALWAYS_ON_MODULES = Object.values(MODULES).filter((m) => m.alwaysOn);
