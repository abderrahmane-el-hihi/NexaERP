import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  tvaRate: z.number().min(0, "TVA rate cannot be negative"),
});

export const createPurchaseOrderSchema = z.object({
  companyId: z.string().uuid("Invalid company/supplier ID"),
  expectedDate: z.date().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, "At least one line item is required"),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
