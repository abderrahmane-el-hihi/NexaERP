const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');
code = code.replace(/ease: "easeOut"/g, 'ease: "easeOut" as any');
fs.writeFileSync('src/app/page.tsx', code);
