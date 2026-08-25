"use server";

import { prisma } from "@/shared/db/prisma";

export async function getNextSequenceNumber(
  tenantId: string,
  type: string,
  year: number
): Promise<string> {
  // Using an atomic update to safely increment the sequence
  const sequence = await prisma.tenantSequence.upsert({
    where: {
      tenantId_type_year: {
        tenantId,
        type,
        year,
      },
    },
    update: {
      nextValue: { increment: 1 },
    },
    create: {
      tenantId,
      type,
      year,
      nextValue: 2, // 1 is returned now, 2 is next
    },
  });

  const valueToReturn = sequence.nextValue - 1;

  // Format: TYPE-YYYY-0000X
  // Example: INV-2026-00001
  let prefix = "";
  if (type === "Devis") prefix = "DEV";
  else if (type === "SalesOrder") prefix = "CMD";
  else if (type === "Invoice") prefix = "FA";
  else prefix = type.substring(0, 3).toUpperCase();

  return `${prefix}-${year}-${valueToReturn.toString().padStart(5, "0")}`;
}
