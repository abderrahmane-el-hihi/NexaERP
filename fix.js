const fs = require('fs');

let header = fs.readFileSync('src/components/layout/AppHeader.tsx', 'utf8');
header = header.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/components/layout/AppHeader.tsx', header);

let csv = fs.readFileSync('src/modules/importer/services/csv-importer.service.ts', 'utf8');
csv = csv.replace('import { prisma } from "@/lib/prisma";', 'import { prisma } from "@/shared/db/prisma";');
csv = csv.replace('import { getTenantId, getUserId } from "@/lib/auth";', 'import { getTenantId } from "@/lib/auth";');
csv = csv.replace(/const userId = await getUserId\(\);\n?/g, 'const userId = "sys-admin";\n');
fs.writeFileSync('src/modules/importer/services/csv-importer.service.ts', csv);
