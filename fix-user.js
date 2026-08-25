const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace('  status    String   @default("active")', '  status    String   @default("active")\n  notifications Notification[]\n  notificationPreferences NotificationPreference[]\n  importJobs ImportJob[]');
fs.writeFileSync('prisma/schema.prisma', content);
