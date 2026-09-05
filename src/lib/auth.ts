import { cookies } from "next/headers";
import { withPlatformBypass } from "@/shared/db/prisma";
import { createClient } from "@/utils/supabase/server";

const ACTIVE_TENANT_COOKIE = "nexa_active_tenant";

/**
 * Retrieves the current logged-in user from Supabase.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Retrieves all tenants associated with the current user.
 */
export async function getUserTenants() {
  const user = await getCurrentUser();
  if (!user) {
    return { activeTenantId: null, tenants: [] };
  }

  // Fetch only the tenants the current user is a member of
  // Resolving which tenants a user belongs to is a platform operation: it necessarily
  // spans tenants and runs before any tenant context exists. It is scoped by userId,
  // which is the only safe way to cross that boundary.
  const memberships = await withPlatformBypass((tx) =>
    tx.tenantMembership.findMany({
      where: { userId: user.id },
      include: {
        tenant: {
          select: { id: true, name: true, ICE: true, city: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  );

  const tenants = memberships.map(m => m.tenant).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  if (tenants.length === 0) {
    return { activeTenantId: null, tenants: [] };
  }

  const cookieStore = await cookies();
  let activeTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;

  // Validate that the activeTenantId from cookie actually belongs to this user
  if (!activeTenantId || !tenants.some(t => t.id === activeTenantId)) {
    activeTenantId = tenants[0].id;
  }

  return {
    activeTenantId,
    tenants,
  };
}

/**
 * Resolves the tenant ID securely on the server from cookie or user session.
 * Throws an error if the user is unauthenticated or has no tenants.
 */
export async function getTenantId(): Promise<string> {
  const { activeTenantId } = await getUserTenants();
  
  if (!activeTenantId) {
    throw new Error("No active tenant found for the current user.");
  }

  return activeTenantId;
}
