const fs = require('fs');
let content = fs.readFileSync('src/modules/importer/services/csv-importer.service.ts', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/modules/importer/services/csv-importer.service.ts', content);
