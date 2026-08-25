const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// Remove header
code = code.replace(/<header[\s\S]*?<\/header>/, '');
// Remove footer
code = code.replace(/<footer[\s\S]*?<\/footer>/, '');
// Remove wrapper
code = code.replace(/<div className="min-h-screen[^>]*>/, '<>');
code = code.replace(/<\/div>\s*\);\s*}\s*$/, '</>\n  );\n}');

fs.writeFileSync('src/app/(marketing)/page.tsx', code);
fs.unlinkSync('src/app/page.tsx');
