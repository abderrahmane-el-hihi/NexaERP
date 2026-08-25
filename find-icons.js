const fs = require('fs');
const { execSync } = require('child_process');

try {
  const files = execSync('dir /s /b src\\*.tsx | findstr ".tsx"', { shell: 'cmd.exe' })
    .toString()
    .trim()
    .split('\r\n');

  let allIcons = new Set();
  files.forEach(f => {
    if (!f) return;
    const content = fs.readFileSync(f, 'utf8');
    const regex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
      icons.forEach(i => allIcons.add(i));
    }
  });
  console.log("Found Icons:");
  console.log(Array.from(allIcons).sort().join(', '));
} catch (e) {
  console.error(e.message);
}
