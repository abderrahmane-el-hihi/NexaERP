"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Squares2X2Icon, UsersIcon, BuildingOffice2Icon, DocumentTextIcon, ShoppingCartIcon, CubeIcon, ChartBarIcon, Cog6ToothIcon, TruckIcon, ReceiptRefundIcon, ArrowTrendingUpIcon, ChevronDownIcon, BookOpenIcon, ArrowUturnLeftIcon, BuildingLibraryIcon, CalculatorIcon, UserIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dictionary } from "@/i18n/dictionaries";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed?: boolean;
}

function NavItem({ href, label, icon: Icon, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
        isActive
          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AppSidebar({ dict }: { dict: Dictionary["sidebar"] }) {
  const [collapsed, setCollapsed] = useState(true);

  const navGroups = [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: Squares2X2Icon },
      ],
    },
    {
      label: dict.crm,
      items: [
        { href: "/dashboard/crm", label: "Pipeline", icon: ArrowTrendingUpIcon },
        { href: "/dashboard/crm/companies", label: dict.companies, icon: BuildingOffice2Icon },
        { href: "/dashboard/crm/contacts", label: dict.contacts, icon: UsersIcon },
      ],
    },
    {
      label: dict.sales,
      items: [
        { href: "/dashboard/sales/devis", label: dict.devis, icon: DocumentTextIcon },
        { href: "/dashboard/sales/orders", label: dict.orders, icon: ShoppingCartIcon },
        { href: "/dashboard/sales/delivery", label: dict.delivery, icon: TruckIcon },
        { href: "/dashboard/sales/invoices", label: dict.invoices, icon: ReceiptRefundIcon },
        { href: "/dashboard/sales/credit-notes", label: dict.creditNotes, icon: ArrowUturnLeftIcon },
      ],
    },
    {
      label: "Catalog",
      items: [
        { href: "/dashboard/catalog", label: dict.catalog, icon: CubeIcon },
      ],
    },
    {
      label: dict.purchasing,
      items: [
        { href: "/dashboard/purchasing/orders", label: dict.purchaseOrders, icon: TruckIcon },
        { href: "/dashboard/purchasing/bills", label: dict.supplierBills, icon: BuildingLibraryIcon },
      ],
    },
    {
      label: dict.inventory,
      items: [
        { href: "/dashboard/inventory", label: dict.stock, icon: CubeIcon },
      ],
    },
    {
      label: dict.hr,
      items: [
        { href: "/dashboard/hr", label: dict.hr, icon: UserIcon },
        { href: "/dashboard/hr/payroll", label: dict.payroll, icon: CalculatorIcon },
      ],
    },
    {
      label: dict.finance,
      items: [
        { href: "/dashboard/finance/reports", label: dict.reports, icon: ChartBarIcon },
        { href: "/dashboard/finance/ledger", label: dict.ledger, icon: BookOpenIcon },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 select-none",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-xs">
          <span className="text-primary-foreground font-black text-sm">N</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-sidebar-foreground tracking-tight text-base">
            NexaERP
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent"
          aria-label="Toggle Sidebar"
        >
          <ChevronDownIcon
            className={cn("h-4 w-4 transition-transform -rotate-90", collapsed && "rotate-90")}
          />
        </button>
      </div>

      {/* Navigation Group Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4 pb-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-sidebar-foreground/45 uppercase tracking-wider px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings Footer */}
      <div className="p-2 border-t border-sidebar-border shrink-0 bg-sidebar/50">
        <NavItem href="/dashboard/settings" label="Settings" icon={Cog6ToothIcon} collapsed={collapsed} />
      </div>
    </aside>
  );
}
