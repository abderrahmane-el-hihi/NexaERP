"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "@/modules/sales/services/sequence.service";
import { getTenantId } from "@/lib/auth";

import { calculateMoroccanPayroll, type MoroccanPayrollCalculation } from "../utils/payroll-calculator";

export type { MoroccanPayrollCalculation };

export async function getEmployees() {
  const tenantId = await getTenantId();

  // Ensure default demo employees exist if table is empty
  const count = await prisma.employee.count({ where: { tenantId } });
  if (count === 0) {
    await prisma.employee.createMany({
      data: [
        {
          tenantId,
          firstName: "Mehdi",
          lastName: "Tazi",
          cin: "BE876543",
          cnssNumber: "198765432",
          email: "mehdi.tazi@atlasdistribution.ma",
          department: "Commercial",
          jobTitle: "Directeur Commercial",
          contractType: "CDI",
          baseSalary: 14000,
          status: "Active",
          bankName: "Attijariwafa Bank",
          bankRIB: "007 780 0001234567890123 45",
        },
        {
          tenantId,
          firstName: "Salma",
          lastName: "Bennani",
          cin: "BK654321",
          cnssNumber: "287654321",
          email: "salma.bennani@atlasdistribution.ma",
          department: "Finance",
          jobTitle: "Responsable Comptable",
          contractType: "CDI",
          baseSalary: 9500,
          status: "Active",
          bankName: "Banque Populaire (BCP)",
          bankRIB: "123 456 0009876543210987 12",
        },
      ],
    });
  }

  return await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createEmployee(data: {
  firstName: string;
  lastName: string;
  cin?: string;
  cnssNumber?: string;
  email?: string;
  phone?: string;
  department?: string;
  jobTitle: string;
  contractType: string;
  baseSalary: number;
}) {
  const tenantId = await getTenantId();
  return await prisma.employee.create({
    data: {
      tenantId,
      ...data,
      status: "Active",
    },
  });
}

export async function getPayrollRuns() {
  const tenantId = await getTenantId();
  return await prisma.payrollRun.findMany({
    where: { tenantId },
    include: {
      payslips: {
        include: { employee: true },
      },
    },
    orderBy: { period: "desc" },
  });
}

/**
 * Runs monthly payroll for all active employees, generates payslips,
 * and auto-posts balanced payroll journal entries to the General Ledger.
 */
export async function runMonthlyPayroll(period: string) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();

  return await prisma.$transaction(async (tx) => {
    const employees = await tx.employee.findMany({
      where: { tenantId, status: "Active" },
    });

    if (employees.length === 0) throw new Error("No active employees found");

    let totalGross = 0;
    let totalNet = 0;
    let totalCnss = 0;
    let totalIgr = 0;

    const payslipData = employees.map((emp) => {
      const calc = calculateMoroccanPayroll(emp.baseSalary);
      totalGross += calc.grossSalary;
      totalNet += calc.netSalary;
      totalCnss += calc.cnssDeduction + calc.amoDeduction;
      totalIgr += calc.igrDeduction;

      return {
        tenantId,
        employeeId: emp.id,
        period,
        grossSalary: calc.grossSalary,
        cnssDeduction: calc.cnssDeduction,
        amoDeduction: calc.amoDeduction,
        fraisPro: calc.fraisPro,
        netTaxable: calc.netTaxable,
        igrDeduction: calc.igrDeduction,
        netSalary: calc.netSalary,
        status: "Generated",
      };
    });

    // Create or update PayrollRun
    const payrollRun = await tx.payrollRun.create({
      data: {
        tenantId,
        period,
        totalGross,
        totalNet,
        totalCnss,
        totalIgr,
        status: "Processed",
        payslips: {
          create: payslipData,
        },
      },
      include: {
        payslips: { include: { employee: true } },
      },
    });

    // Ensure Standard Payroll Accounts exist
    const [acc6171, acc4432, acc4441, acc4452] = await Promise.all([
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "6171" } },
        update: {},
        create: { tenantId, code: "6171", name: "Rémunérations du personnel", type: "Expense" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4432" } },
        update: {},
        create: { tenantId, code: "4432", name: "Rémunérations dues au personnel", type: "Liability" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4441" } },
        update: {},
        create: { tenantId, code: "4441", name: "Organismes sociaux - CNSS", type: "Liability" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4452" } },
        update: {},
        create: { tenantId, code: "4452", name: "État - IGR retenu à la source", type: "Liability" },
      }),
    ]);

    // Post balanced Payroll Journal Entry to General Ledger
    const journalNumber = await getNextSequenceNumber(tenantId, "JournalEntry", year);
    await tx.journalEntry.create({
      data: {
        tenantId,
        number: journalNumber,
        description: `Paie et Salaires du Personnel - Période ${period}`,
        sourceType: "Payroll",
        sourceId: payrollRun.id,
        status: "Posted",
        lines: {
          create: [
            {
              tenantId,
              accountId: acc6171.id,
              debit: totalGross,
              credit: 0,
              description: `Charges salariales brutes - ${period}`,
            },
            {
              tenantId,
              accountId: acc4432.id,
              debit: 0,
              credit: totalNet,
              description: `Salaires nets à virer au personnel`,
            },
            {
              tenantId,
              accountId: acc4441.id,
              debit: 0,
              credit: totalCnss,
              description: `Cotisations CNSS + AMO salariales`,
            },
            {
              tenantId,
              accountId: acc4452.id,
              debit: 0,
              credit: totalIgr,
              description: `Retenue à la source IGR`,
            },
          ],
        },
      },
    });

    return payrollRun;
  });
}
