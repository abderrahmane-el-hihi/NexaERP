import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { getUserTenants, getCurrentUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n/i18n.service";
import { NotificationService } from "@/modules/notifications/services/notification.service";

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeTenantId, tenants } = await getUserTenants();
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = await getDictionary();

  if (!activeTenantId || !user) {
    redirect("/onboarding");
  }

  const notifications = await NotificationService.getUnread(activeTenantId, user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar dict={dict.sidebar} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader activeTenantId={activeTenantId} tenants={tenants} locale={locale} notifications={notifications} userEmail={user.email} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
