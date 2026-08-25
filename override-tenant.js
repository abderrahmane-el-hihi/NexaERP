const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
const tenantModelStr = `model Tenant {
  id               String    @id @default(uuid())
  name             String
  legalName        String?
  ICE              String?
  RC               String?
  IF               String?
  Patente          String?
  address          String?
  city             String?
  defaultCurrency  String    @default("MAD")
  fiscalYearStart  DateTime?
  logo             String?
  enabledModules   Json?
  subscriptionPlan String?
  subscriptionStatus String  @default("Trial")
  trialEndsAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  memberships   TenantMembership[]
  companies     Company[]
  contacts      Contact[]
  opportunities Opportunity[]
  activities    Activity[]

  products       Product[]
  warehouses     Warehouse[]
  devis          Devis[]
  devisLines     DevisLine[]
  salesOrders    SalesOrder[]
  deliveryNotes  DeliveryNote[]
  invoices       Invoice[]
  payments       Payment[]
  stockMovements StockMovement[]
  sequences      TenantSequence[]

  purchaseOrders      PurchaseOrder[]
  supplierReceipts    SupplierReceipt[]
  supplierBills       SupplierBill[]
  accounts            Account[]
  journalEntries      JournalEntry[]
  accountingPeriods   AccountingPeriod[]
  physicalInventories PhysicalInventory[]
  purchaseOrderLines  PurchaseOrderLine[]
  journalEntryLines   JournalEntryLine[]
  creditNotes         CreditNote[]
  employees           Employee[]
  payrollRuns         PayrollRun[]
  payslips            Payslip[]
  notifications       Notification[]
  notificationPreferences NotificationPreference[]
  importJobs          ImportJob[]
}`;
content = content.replace(/model Tenant \{[\s\S]+?\}\s*\n/, tenantModelStr + '\n\n');
fs.writeFileSync('prisma/schema.prisma', content);
