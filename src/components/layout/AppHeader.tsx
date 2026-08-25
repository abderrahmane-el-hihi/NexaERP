"use client";

import { useState } from "react";
import { BellIcon, MagnifyingGlassIcon, UserIcon, ArrowRightOnRectangleIcon, Cog8ToothIcon } from "@heroicons/react/24/outline";
import { TenantSwitcher } from "./TenantSwitcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { logout } from "@/app/auth/actions";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface AppHeaderProps {
  activeTenantId: string;
  tenants: Array<{
    id: string;
    name: string;
    ICE: string | null;
    city: string | null;
  }>;
  locale: string;
  notifications: Notification[];
  userEmail: string | undefined;
}

export function AppHeader({ activeTenantId, tenants, locale, notifications, userEmail }: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BellIcon className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${!n.isRead ? 'bg-muted/10' : ''}`}>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
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
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="relative">
          <div 
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
          </div>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden flex flex-col py-1">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{userEmail}</p>
              </div>
              <div className="p-1">
                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setShowProfile(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <Cog8ToothIcon className="h-4 w-4" />
                  Workspace Settings
                </Link>
                <form action={logout}>
                  <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
