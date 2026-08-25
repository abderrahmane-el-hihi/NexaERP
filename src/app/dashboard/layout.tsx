import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { getUserTenants } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n/i18n.service";

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeTenantId, tenants } = await getUserTenants();
  const locale = await getLocale();
  const dict = await getDictionary();

  if (!activeTenantId) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar dict={dict.sidebar} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader activeTenantId={activeTenantId} tenants={tenants} locale={locale} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
