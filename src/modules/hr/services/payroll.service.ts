"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize, sum } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { audit } from "@/modules/platform/services/audit.service";
import { postEntry } from "@/modules/finance/services/posting.service";
import { calculateMoroccanPayroll, type MoroccanPayrollCalculation } from "../utils/payroll-calculator";

export type { MoroccanPayrollCalculation };

/**
 * Payroll.
 *
 * WARNING: CNSS, AMO and IR rules change with every Loi de Finances and vary by
 * collective agreement. The calculator in ../utils is a convenience, not a source of
 * legal truth — verify the brackets against the current year before relying on it, and
 * prefer importing the journal entry from the payroll provider (blueprint §5.9).
 *
 * What this module guarantees is the accounting: the payroll entry is balanced and
 * posted through the same engine as every other document.
 */

export async function getEmployees() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.employee.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
    })
  );
  return serialize(rows);
}

export async function createEmployee(data: {
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: number | string;
  cin?: string;
  cnssNumber?: string;
  email?: string;
  phone?: string;
  department?: string;
  contractType?: string;
  hireDate?: Date;
  bankName?: string;
  bankRIB?: string;
}) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        baseSalary: new Prisma.Decimal(dec(data.baseSalary).toFixed(6)),
        cin: data.cin ?? null,
        cnssNumber: data.cnssNumber ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        department: data.department ?? null,
        contractType: data.contractType ?? "CDI",
        hireDate: data.hireDate ?? new Date(),
        bankName: data.bankName ?? null,
        bankRIB: data.bankRIB ?? null,
      },
    });
    await audit(tx, { tenantId, entityType: "Employee", entityId: employee.id, action: "CREATE" });
    return serialize(employee);
  });
}

export async function getPayrollRuns() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.payrollRun.findMany({
      where: { tenantId },
      include: { payslips: { include: { employee: true } } },
      orderBy: { period: "desc" },
    })
  );
  return serialize(rows);
}

/**
 * Runs payroll for a period and posts the resulting entry:
 *   Dr 6171 Rémunérations du personnel   (gross)
 *      Cr 4432 Personnel — rémunérations dues   (net)
 *      Cr 4441 CNSS et organismes sociaux       (social contributions)
 *      Cr 4452 État — impôts et taxes           (IR withheld)
 */
export async function runMonthlyPayroll(period: string) {
  const tenantId = await getTenantId();

  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw domainError("VALIDATION_FAILED", "Période attendue au format AAAA-MM");
  }

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.payrollRun.findFirst({ where: { tenantId, period } });
    if (existing) {
      throw domainError("DUPLICATE_DOCUMENT", `La paie ${period} a déjà été traitée`, {
        payrollRunId: existing.id,
      });
    }

    const employees = await tx.employee.findMany({ where: { tenantId, status: "Active" } });
    if (employees.length === 0) {
      throw domainError("VALIDATION_FAILED", "Aucun salarié actif");
    }

    const calculations = employees.map((employee) => ({
      employee,
      calc: calculateMoroccanPayroll(Number(employee.baseSalary)),
    }));

    const totalGross = sum(calculations.map((c) => c.calc.grossSalary));
    const totalNet = sum(calculations.map((c) => c.calc.netSalary));
    const totalCnss = sum(calculations.map((c) => c.calc.cnssDeduction + c.calc.amoDeduction));
    const totalIgr = sum(calculations.map((c) => c.calc.igrDeduction));

    const [year, month] = period.split("-").map(Number);
    const runDate = new Date(Date.UTC(year, month, 0));

    const run = await tx.payrollRun.create({
      data: {
        tenantId,
        period,
        date: runDate,
        status: "Processed",
        totalGross: new Prisma.Decimal(totalGross.toFixed(6)),
        totalNet: new Prisma.Decimal(totalNet.toFixed(6)),
        totalCnss: new Prisma.Decimal(totalCnss.toFixed(6)),
        totalIgr: new Prisma.Decimal(totalIgr.toFixed(6)),
        payslips: {
          create: calculations.map(({ employee, calc }) => ({
            tenantId,
            employeeId: employee.id,
            period,
            grossSalary: new Prisma.Decimal(dec(calc.grossSalary).toFixed(6)),
            cnssDeduction: new Prisma.Decimal(dec(calc.cnssDeduction).toFixed(6)),
            amoDeduction: new Prisma.Decimal(dec(calc.amoDeduction).toFixed(6)),
            fraisPro: new Prisma.Decimal(dec(calc.fraisPro).toFixed(6)),
            netTaxable: new Prisma.Decimal(dec(calc.netTaxable).toFixed(6)),
            igrDeduction: new Prisma.Decimal(dec(calc.igrDeduction).toFixed(6)),
            netSalary: new Prisma.Decimal(dec(calc.netSalary).toFixed(6)),
            status: "Generated",
          })),
        },
      },
    });

    // The entry balances by construction: gross = net + social + tax.
    const residual = totalGross.minus(totalNet).minus(totalCnss).minus(totalIgr);
    if (!residual.isZero()) {
      throw domainError(
        "UNBALANCED_ENTRY",
        `Écart de paie de ${residual.toFixed(2)}: brut ≠ net + charges + IR`,
        { residual: residual.toFixed(2) }
      );
    }

    await postEntry(tx, {
      tenantId,
      date: runDate,
      description: `Paie ${period}`,
      journalCode: "OD",
      sourceType: "PayrollRun",
      sourceId: run.id,
      lines: [
        { accountCode: "6171", debit: totalGross, description: `Salaires bruts ${period}` },
        { accountCode: "4432", credit: totalNet, description: `Net à payer ${period}` },
        ...(totalCnss.isZero()
          ? []
          : [{ accountCode: "4441", credit: totalCnss, description: `CNSS / AMO ${period}` }]),
        ...(totalIgr.isZero()
          ? []
          : [{ accountCode: "4452", credit: totalIgr, description: `IR retenu ${period}` }]),
      ],
    });

    await audit(tx, {
      tenantId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "POST",
      diff: { period, employees: employees.length, gross: totalGross.toFixed(2) },
    });

    return serialize(
      await tx.payrollRun.findUniqueOrThrow({
        where: { id: run.id },
        include: { payslips: { include: { employee: true } } },
      })
    );
  });
}
