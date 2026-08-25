"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getTvaSummary(month: number, year: number) {
  const tenantId = await getTenantId();
  // In MVP, we just fetch invoices for the period and aggregate TVA.
  // A real implementation would also include purchase receipts (TVA déductible).
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["Finalized", "Sent", "Paid", "Overdue"] }
    }
  });
  
  // Aggregate TVA (simplified: assuming we store it at header level for MVP)
  // Real implementation needs line-level aggregation per rate
  const totalCollected = invoices.reduce((sum, inv) => sum + (inv.total - inv.subtotal), 0);
  const totalDeductible = 0; // Requires Purchase records
  
  return {
    period: `${year}-${month.toString().padStart(2, '0')}`,
    collected: totalCollected,
    deductible: totalDeductible,
    netPayable: totalCollected - totalDeductible
  };
}

export async function getAgedReceivables() {
  const tenantId = await getTenantId();
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: ["Finalized", "Sent", "PartiallyPaid", "Overdue"] },
    },
    include: { company: true }
  });
  
  const now = new Date();
  
  // Group by company
  const balances = invoices.reduce((acc, inv) => {
    if (!acc[inv.companyId]) {
      acc[inv.companyId] = {
        companyName: inv.company.name,
        totalDue: 0,
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
      };
    }
    
    // Simplification: In a real app we'd have a Payment model tracking amountPaid vs amountDue
    // Here we'll just treat the whole total as due if not Paid
    const amountDue = inv.total; // Assumes unpaid for this mock
    acc[inv.companyId].totalDue += amountDue;
    
    // Mock dueDate as date + 30 days
    const dueDate = new Date(inv.date);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysOverdue <= 0) acc[inv.companyId].current += amountDue;
    else if (daysOverdue <= 30) acc[inv.companyId].days30 += amountDue;
    else if (daysOverdue <= 60) acc[inv.companyId].days60 += amountDue;
    else acc[inv.companyId].days90Plus += amountDue;
    
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(balances);
}
