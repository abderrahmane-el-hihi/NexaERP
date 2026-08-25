"use server";

import { cookies } from "next/headers";

const ACTIVE_TENANT_COOKIE = "nexa_active_tenant";

/**
 * Server action to switch active workspace
 */
export async function switchActiveTenant(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
