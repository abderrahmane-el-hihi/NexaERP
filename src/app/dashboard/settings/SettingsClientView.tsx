"use client";

import { useState } from "react";
import { CompanyProfileTab } from "@/modules/tenant/components/CompanyProfileTab";
import { CommercialSettingsTab } from "@/modules/tenant/components/CommercialSettingsTab";
import { SubscriptionBillingTab } from "@/modules/tenant/components/SubscriptionBillingTab";
import { ModuleTogglesTab } from "@/modules/tenant/components/ModuleTogglesTab";
import { TeamManagementTab } from "@/modules/tenant/components/TeamManagementTab";
import { ComplianceDGITab } from "@/modules/tenant/components/ComplianceDGITab";
import { DataPrivacyTab } from "@/modules/tenant/components/DataPrivacyTab";
import { BuildingOffice2Icon, DocumentTextIcon, CreditCardIcon, RectangleStackIcon, UsersIcon, DocumentCheckIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

interface SettingsClientViewProps {
  tenant: any;
  planData: any;
}

const TABS = [
  { id: "profile", label: "Company & Legal Profile", icon: BuildingOffice2Icon },
  { id: "billing", label: "Subscription & Plans", icon: CreditCardIcon },
  { id: "commercial", label: "Commercial & Invoicing", icon: DocumentTextIcon },
  { id: "modules", label: "Modular Apps", icon: RectangleStackIcon },
  { id: "team", label: "Team & Roles (RBAC)", icon: UsersIcon },
  { id: "compliance", label: "DGI E-Invoicing", icon: DocumentCheckIcon },
  { id: "privacy", label: "Data & CNDP", icon: ShieldCheckIcon },
];

export function SettingsClientView({ tenant, planData }: SettingsClientViewProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "profile" && <CompanyProfileTab tenant={tenant} />}
        {activeTab === "billing" && <SubscriptionBillingTab planData={planData} />}
        {activeTab === "commercial" && <CommercialSettingsTab tenant={tenant} />}
        {activeTab === "modules" && <ModuleTogglesTab tenant={tenant} />}
        {activeTab === "team" && <TeamManagementTab memberships={tenant.memberships || []} />}
        {activeTab === "compliance" && <ComplianceDGITab tenant={tenant} />}
        {activeTab === "privacy" && <DataPrivacyTab />}
      </div>
    </div>
  );
}
