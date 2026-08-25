import type { ModuleCode } from "@/shared/modules/module-config";

export type SaaSPlanTier = "Starter" | "Growth" | "Business";

export interface PlanDefinition {
  id: SaaSPlanTier;
  name: string;
  priceMAD: number;
  description: string;
  badge?: string;
  allowedModules: ModuleCode[];
  maxUsers: number;
  maxWarehouses: number;
  features: string[];
}

export const SAAS_PLANS: Record<SaaSPlanTier, PlanDefinition> = {
  Starter: {
    id: "Starter",
    name: "Starter (TPE)",
    priceMAD: 190,
    description: "Ideal for Moroccan micro-enterprises and sole traders.",
    allowedModules: ["CRM", "SD", "DOC"],
    maxUsers: 3,
    maxWarehouses: 1,
    features: [
      "Customer Relationship Management (CRM)",
      "Commercial Quotes (Devis) & Invoices (FA)",
      "Moroccan Multi-rate TVA (0%, 7%, 10%, 14%, 20%)",
      "Gapless Sequential Numbering",
      "Up to 3 Team Users",
      "1 Warehouse Location",
    ],
  },
  Growth: {
    id: "Growth",
    name: "Growth (PME)",
    priceMAD: 490,
    description: "For trading and distribution companies holding physical stock.",
    badge: "Most Popular",
    allowedModules: ["CRM", "SD", "MM", "INV", "DOC"],
    maxUsers: 10,
    maxWarehouses: 5,
    features: [
      "Everything in Starter",
      "Purchasing & Supplier Orders (MM-PUR)",
      "3-Way Match & Accounts Payable (FF)",
      "Delivery Notes (BL) with Auto-Stock Deduction",
      "Real-time Append-Only Inventory Ledger",
      "Up to 10 Team Users & 5 Warehouses",
    ],
  },
  Business: {
    id: "Business",
    name: "Business Pro",
    priceMAD: 990,
    description: "Complete ERP suite with financial statements and Moroccan payroll.",
    allowedModules: ["CRM", "SD", "MM", "INV", "FI", "COMP", "DOC"],
    maxUsers: 50,
    maxWarehouses: 99,
    features: [
      "Everything in Growth",
      "Financial Statements (CPC / P&L, Bilan Actif-Passif)",
      "Aged AR & AP Balance Âgée",
      "Moroccan Payroll Engine (CNSS/AMO/IGR Payslips)",
      "DGI Simpl-TVA Clearance XML (Article 145 CGI)",
      "Unlimited Users & Warehouses",
      "Priority Support & CNDP Data Portability",
    ],
  },
};
