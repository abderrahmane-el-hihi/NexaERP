const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Remove the bad fields from Employee
content = content.replace(/notifications\s+Notification\[\]\s*notificationPreferences\s+NotificationPreference\[\]\s*importJobs\s+ImportJob\[\]/g, '');

// 2. Add back missing relations to Tenant
content = content.replace('stockLevels   StockLevel[]', '');
content = content.replace(/contacts\s+Contact\[\]/, 'contacts      Contact[]\n  opportunities Opportunity[]\n  activities    Activity[]');
content = content.replace(/devisLines\s+DevisLine\[\]/, 'devisLines     DevisLine[]\n  invoices       Invoice[]');
content = content.replace(/physicalInventories PhysicalInventory\[\]/, 'physicalInventories PhysicalInventory[]\n  purchaseOrderLines  PurchaseOrderLine[]\n  journalEntryLines   JournalEntryLine[]');

// 3. Add the new models relations to Tenant correctly
content = content.replace(/sequences\s+TenantSequence\[\]/, 'sequences      TenantSequence[]\n  notifications       Notification[]\n  notificationPreferences NotificationPreference[]\n  importJobs          ImportJob[]');

// 4. Add the new models relations to User
content = content.replace(/memberships\s+TenantMembership\[\]/, 'memberships   TenantMembership[]\n  notifications Notification[]\n  notificationPreferences NotificationPreference[]\n  importJobs ImportJob[]');

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Fixed schema.');
