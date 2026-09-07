import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { provisionPlatformUser } from "@/app/auth/actions";
import { signupInputSchema } from "@/app/auth/schemas";
import {
  createNewEnterprise,
  purgeDemoData,
} from "@/modules/tenant/services/onboarding.service";
import {
  getActivationStatus,
  skipDataImport,
} from "@/modules/tenant/services/activation.service";
import { withPlatformBypass, withTenant } from "@/shared/db/prisma";

describe("Pilot Onboarding & Activation System", () => {
  describe("1. Signup Input Validation Schema", () => {
    it("accepts valid Moroccan signup data", () => {
      const valid = signupInputSchema.safeParse({
        email: "karim.alami@atlas-logistics.ma",
        password: "StrongPassword2026!",
        companyName: "Atlas Logistics SARL",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid emails and short passwords", () => {
      const invalidEmail = signupInputSchema.safeParse({
        email: "not-an-email",
        password: "validpassword123",
        companyName: "Test SARL",
      });
      expect(invalidEmail.success).toBe(false);

      const shortPassword = signupInputSchema.safeParse({
        email: "test@example.ma",
        password: "short",
        companyName: "Test SARL",
      });
      expect(shortPassword.success).toBe(false);

      const emptyName = signupInputSchema.safeParse({
        email: "test@example.ma",
        password: "validpassword123",
        companyName: "   ",
      });
      expect(emptyName.success).toBe(false);
    });
  });

  describe("2. Idempotent Platform User Provisioning", () => {
    it("provisions and reconciles user rows safely", async () => {
      const userId = `u-prov-${randomUUID()}`;
      const email = `${userId}@pilot-test.ma`;

      // First run: create user
      const user1 = await provisionPlatformUser({
        id: userId,
        email,
        name: "Initial Name",
      });
      expect(user1.id).toBe(userId);
      expect(user1.email).toBe(email);
      expect(user1.name).toBe("Initial Name");

      // Second run: idempotent update
      const user2 = await provisionPlatformUser({
        id: userId,
        email,
        name: "Updated Name",
      });
      expect(user2.id).toBe(userId);
      expect(user2.name).toBe("Updated Name");

      // Verify in DB with platform bypass
      const userInDb = await withPlatformBypass((tx) =>
        tx.user.findUnique({ where: { id: userId } })
      );
      expect(userInDb?.name).toBe("Updated Name");
    });
  });

  describe("3. Idempotent Enterprise Creation", () => {
    it("creates an enterprise on first call and returns existing tenant on subsequent calls", async () => {
      const userId = `u-tenant-${randomUUID()}`;
      const email = `${userId}@pilot-tenant.ma`;

      await provisionPlatformUser({ id: userId, email, name: "Directeur Général" });

      const input = {
        name: "Société Maghreb Innov SARL",
        ICE: "003456789000012",
        IF: "87654321",
        RC: "54321",
        city: "Casablanca",
        address: "Boulevard d'Anfa, Casablanca",
        dataMode: "clean" as const,
      };

      // Call 1: First creation
      const res1 = await createNewEnterprise(input, { userId });
      expect(res1.success).toBe(true);
      expect(res1.alreadyExisted).toBe(false);
      expect(res1.tenantId).toBeDefined();

      const tenantId = res1.tenantId;

      // Verify tenant has Moroccan COA foundation & warehouse
      await withTenant(tenantId, async (tx) => {
        const accountsCount = await tx.account.count({ where: { tenantId } });
        expect(accountsCount).toBeGreaterThanOrEqual(25);

        const journalsCount = await tx.journal.count({ where: { tenantId } });
        expect(journalsCount).toBeGreaterThanOrEqual(5);

        const warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
        expect(warehouse).not.toBeNull();
        expect(warehouse?.isDefault).toBe(true);

        const membership = await tx.tenantMembership.findFirst({
          where: { tenantId, userId },
        });
        expect(membership?.role).toBe("Owner");
      });

      // Call 2: Duplicate call for same user (e.g. user refreshed or double clicked)
      const res2 = await createNewEnterprise(input, { userId });
      expect(res2.success).toBe(true);
      expect(res2.alreadyExisted).toBe(true);
      expect(res2.tenantId).toBe(tenantId);

      // Verify no duplicate tenant was created
      const memberships = await withPlatformBypass((tx) =>
        tx.tenantMembership.findMany({ where: { userId } })
      );
      expect(memberships).toHaveLength(1);
    });
  });

  describe("4. Clean vs Demo Data Mode", () => {
    it("clean tenant has zero demo records", async () => {
      const userId = `u-clean-${randomUUID()}`;
      await provisionPlatformUser({ id: userId, email: `${userId}@clean.ma` });

      const res = await createNewEnterprise(
        { name: "Clean Enterprise SARL", city: "Rabat", dataMode: "clean" },
        { userId }
      );

      await withTenant(res.tenantId, async (tx) => {
        const companies = await tx.company.findMany({ where: { tenantId: res.tenantId } });
        expect(companies).toHaveLength(0);

        const products = await tx.product.findMany({ where: { tenantId: res.tenantId } });
        expect(products).toHaveLength(0);

        const devis = await tx.devis.findMany({ where: { tenantId: res.tenantId } });
        expect(devis).toHaveLength(0);
      });
    });

    it("demo tenant seeds sample customer, product and quote with audit trail", async () => {
      const userId = `u-demo-${randomUUID()}`;
      await provisionPlatformUser({ id: userId, email: `${userId}@demo.ma` });

      const res = await createNewEnterprise(
        { name: "Demo Enterprise SARL", city: "Casablanca", dataMode: "demo" },
        { userId }
      );

      await withTenant(res.tenantId, async (tx) => {
        const demoCompanies = await tx.company.findMany({
          where: { tenantId: res.tenantId, tags: { has: "demo" } },
        });
        expect(demoCompanies).toHaveLength(1);
        expect(demoCompanies[0].ICE).toBe("001234567890001");

        const demoProducts = await tx.product.findMany({
          where: { tenantId: res.tenantId, category: "DEMO" },
        });
        expect(demoProducts).toHaveLength(1);
        expect(demoProducts[0].reference).toBe("DEMO-SRV-01");

        const demoDevis = await tx.devis.findMany({
          where: { tenantId: res.tenantId, number: "DEV-DEMO-0001" },
          include: { lines: true },
        });
        expect(demoDevis).toHaveLength(1);
        expect(demoDevis[0].lines).toHaveLength(1);

        const auditLogs = await tx.auditLog.findMany({
          where: { tenantId: res.tenantId, action: "DEMO_DATA_SEEDED" },
        });
        expect(auditLogs).toHaveLength(1);
      });
    });
  });

  describe("5. Demo Data Purge & Isolation", () => {
    it("safely purges demo records without corrupting Chart of Accounts", async () => {
      const userId = `u-purge-${randomUUID()}`;
      await provisionPlatformUser({ id: userId, email: `${userId}@purge.ma` });

      const res = await createNewEnterprise(
        { name: "Enterprise To Purge SARL", city: "Tanger", dataMode: "demo" },
        { userId }
      );

      const tenantId = res.tenantId;

      // Verify demo records are present before purge
      await withTenant(tenantId, async (tx) => {
        const compCount = await tx.company.count({ where: { tenantId } });
        expect(compCount).toBe(1);
        const prodCount = await tx.product.count({ where: { tenantId } });
        expect(prodCount).toBe(1);
        const devisCount = await tx.devis.count({ where: { tenantId } });
        expect(devisCount).toBe(1);
      });

      // Purge demo data
      const purgeResult = await purgeDemoData(tenantId, userId);
      expect(purgeResult.success).toBe(true);

      // Verify demo records are gone but standard COA is preserved
      await withTenant(tenantId, async (tx) => {
        const compCount = await tx.company.count({ where: { tenantId } });
        expect(compCount).toBe(0);

        const prodCount = await tx.product.count({ where: { tenantId } });
        expect(prodCount).toBe(0);

        const devisCount = await tx.devis.count({ where: { tenantId } });
        expect(devisCount).toBe(0);

        // Chart of Accounts must remain 100% intact
        const accountsCount = await tx.account.count({ where: { tenantId } });
        expect(accountsCount).toBeGreaterThanOrEqual(25);

        const journalsCount = await tx.journal.count({ where: { tenantId } });
        expect(journalsCount).toBeGreaterThanOrEqual(5);

        // Verify audit log recorded
        const purgeLog = await tx.auditLog.findFirst({
          where: { tenantId, action: "DEMO_DATA_PURGED" },
        });
        expect(purgeLog).not.toBeNull();
        expect(purgeLog?.userId).toBe(userId);
      });
    });
  });

  describe("6. Live Activation Status Derivation", () => {
    it("derives milestone status dynamically from live database rows", async () => {
      const userId = `u-act-${randomUUID()}`;
      await provisionPlatformUser({ id: userId, email: `${userId}@act.ma` });

      const res = await createNewEnterprise(
        {
          name: "Atlas Activation SARL",
          ICE: "009988776655443",
          city: "Casablanca",
          dataMode: "clean",
        },
        { userId }
      );

      const tenantId = res.tenantId;

      // Initial status: only company_info is complete
      let status = await getActivationStatus(tenantId);
      expect(status.completedCount).toBe(1);
      expect(status.totalCount).toBe(6);
      expect(status.isComplete).toBe(false);
      expect(status.milestones.find((m) => m.id === "company_info")?.completed).toBe(true);
      expect(status.milestones.find((m) => m.id === "data_import")?.completed).toBe(false);
      expect(status.milestones.find((m) => m.id === "first_customer")?.completed).toBe(false);

      // User skips data import
      await skipDataImport(tenantId);
      status = await getActivationStatus(tenantId);
      expect(status.completedCount).toBe(2);
      expect(status.milestones.find((m) => m.id === "data_import")?.completed).toBe(true);

      // User creates a real customer
      await withTenant(tenantId, (tx) =>
        tx.company.create({
          data: {
            tenantId,
            name: "Nouveau Client Réel SARL",
            type: "customer",
            ICE: "001122334455667",
            city: "Casablanca",
          },
        })
      );

      status = await getActivationStatus(tenantId);
      expect(status.completedCount).toBe(3);
      expect(status.milestones.find((m) => m.id === "first_customer")?.completed).toBe(true);
    });
  });
});
