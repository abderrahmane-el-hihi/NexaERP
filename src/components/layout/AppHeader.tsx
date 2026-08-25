"use client";

import { useState } from "react";
import { BellIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { TenantSwitcher } from "./TenantSwitcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

interface AppHeaderProps {
  activeTenantId: string;
  tenants: Array<{
    id: string;
    name: string;
    ICE: string | null;
    city: string | null;
  }>;
  locale: string;
}

// Temporary mock data for UI visualization
const MOCK_NOTIFICATIONS = [
  { id: "1", title: "Invoice Overdue", message: "Invoice FA-2026-005 is 3 days overdue.", type: "invoice.overdue", isRead: false, time: "2h ago" },
  { id: "2", title: "Stock Low", message: "Product SKU-102 dropped below reorder point.", type: "stock.low", isRead: false, time: "5h ago" },
  { id: "3", title: "PO Received", message: "Purchase Order PO-2026-012 was fully received.", type: "po.received", isRead: true, time: "1d ago" },
];

export function AppHeader({ activeTenantId, tenants, locale }: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.isRead).length;

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-6 gap-4 shrink-0 relative">
      {/* SaaS Multi-Tenant Workspace Switcher */}
      <TenantSwitcher activeTenantId={activeTenantId} tenants={tenants} />

      {/* Global Search */}
      <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5 text-sm text-muted-foreground flex-1 max-w-sm ml-2">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
        <span className="text-xs">Search documents, customers...</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Toggles */}
        <LanguageToggle currentLocale={locale} />
        <ThemeToggle />
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BellIcon className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button className="text-xs text-primary hover:underline">Mark all as read</button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {MOCK_NOTIFICATIONS.length > 0 ? (
                  MOCK_NOTIFICATIONS.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${!n.isRead ? 'bg-muted/10' : ''}`}>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                )}
              </div>
              <div className="p-2 bg-muted/20 border-t border-border">
                <button className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-center rounded-md hover:bg-muted">
                  View Notification Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-xs">
          A
        </div>
      </div>
    </header>
  );
}
