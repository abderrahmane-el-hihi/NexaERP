const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!content.includes('subscriptionStatus')) {
  content = content.replace(/subscriptionPlan\s+String\?/, 'subscriptionPlan String?\n  subscriptionStatus String @default("Trial")\n  trialEndsAt      DateTime?');
}

if (!content.includes('notifications       Notification[]')) {
  content = content.replace(/payslips\s+Payslip\[\]\s*\n\}/, 'payslips            Payslip[]\n  notifications       Notification[]\n  notificationPreferences NotificationPreference[]\n  importJobs          ImportJob[]\n}');
}

if (!content.includes('model Notification {')) {
  content += `

// ---------------------------------------------------------
// Notifications & Imports
// ---------------------------------------------------------

model Notification {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  type        String   
  title       String
  message     String
  actionUrl   String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model NotificationPreference {
  id          String   @id @default(uuid())
  userId      String
  tenantId    String
  type        String   
  email       Boolean  @default(true)
  inApp       Boolean  @default(true)

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId, type])
}

model ImportJob {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  entityType  String   
  status      String   
  totalRows   Int      @default(0)
  successRows Int      @default(0)
  errorRows   Int      @default(0)
  errorLog    Json?    
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`;
}

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Schema updated successfully.');
