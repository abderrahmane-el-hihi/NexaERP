const fs = require('fs');
const { execSync } = require('child_process');

const iconMap = {
  "AlertCircle": "ExclamationCircleIcon",
  "AlertTriangle": "ExclamationTriangleIcon",
  "ArrowDownUp": "ArrowsUpDownIcon",
  "ArrowLeft": "ArrowLeftIcon",
  "ArrowRight": "ArrowRightIcon",
  "BadgePercent": "TagIcon",
  "BarChart3": "ChartBarIcon",
  "Bell": "BellIcon",
  "Book": "BookOpenIcon",
  "BookOpen": "BookOpenIcon",
  "Boxes": "Square3Stack3DIcon",
  "Briefcase": "BriefcaseIcon",
  "Building": "BuildingOfficeIcon",
  "Building2": "BuildingOffice2Icon",
  "Calculator": "CalculatorIcon",
  "Check": "CheckIcon",
  "CheckCircle": "CheckCircleIcon",
  "CheckCircle2": "CheckCircleIcon",
  "CheckIcon": "CheckIcon",
  "ChevronDown": "ChevronDownIcon",
  "ChevronDownIcon": "ChevronDownIcon",
  "ChevronLeft": "ChevronLeftIcon",
  "ChevronRight": "ChevronRightIcon",
  "ChevronUpIcon": "ChevronUpIcon",
  "Clock": "ClockIcon",
  "CreditCard": "CreditCardIcon",
  "Database": "CircleStackIcon",
  "Download": "ArrowDownTrayIcon",
  "Edit2": "PencilSquareIcon",
  "ExternalLink": "ArrowTopRightOnSquareIcon",
  "FileCheck": "DocumentCheckIcon",
  "FileDown": "DocumentArrowDownIcon",
  "FileSpreadsheet": "TableCellsIcon",
  "FileText": "DocumentTextIcon",
  "Globe": "GlobeAltIcon",
  "Landmark": "BuildingLibraryIcon",
  "Layers": "RectangleStackIcon",
  "LayoutDashboard": "Squares2X2Icon",
  "Loader2": "ArrowPathIcon",
  "Lock": "LockClosedIcon",
  "Mail": "EnvelopeIcon",
  "MapPin": "MapPinIcon",
  "Package": "CubeIcon",
  "PackageCheck": "CheckBadgeIcon",
  "PackagePlus": "PlusCircleIcon",
  "PackageSearch": "MagnifyingGlassIcon",
  "PanelLeftIcon": "Bars3Icon",
  "Paperclip": "PaperClipIcon",
  "Phone": "PhoneIcon",
  "Play": "PlayIcon",
  "Plus": "PlusIcon",
  "Receipt": "ReceiptRefundIcon",
  "RefreshCw": "ArrowPathIcon",
  "RotateCcw": "ArrowUturnLeftIcon",
  "Save": "DocumentCheckIcon",
  "Search": "MagnifyingGlassIcon",
  "Settings": "Cog6ToothIcon",
  "Shield": "ShieldCheckIcon",
  "ShieldAlert": "ShieldExclamationIcon",
  "ShieldCheck": "ShieldCheckIcon",
  "ShoppingCart": "ShoppingCartIcon",
  "Sparkles": "SparklesIcon",
  "Trash2": "TrashIcon",
  "TrendingUp": "ArrowTrendingUpIcon",
  "Truck": "TruckIcon",
  "UploadCloud": "ArrowUpTrayIcon",
  "UserCheck": "UserIcon",
  "UserPlus": "UserPlusIcon",
  "Users": "UsersIcon",
  "XIcon": "XMarkIcon",
  "Zap": "BoltIcon"
};

try {
  const files = execSync('dir /s /b src\\*.tsx src\\*.ts | findstr "\\.tsx$ \\.ts$"', { shell: 'cmd.exe' })
    .toString()
    .trim()
    .split('\r\n');

  files.forEach(f => {
    if (!f) return;
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    // Find lucide imports
    const regex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
    let match;
    let iconsToReplace = [];
    
    // We might have multiple import lines, though usually just one
    content = content.replace(regex, (fullMatch, group1) => {
      modified = true;
      const icons = group1.split(',').map(i => i.trim()).filter(Boolean);
      icons.forEach(i => iconsToReplace.push(i));
      
      const newIcons = Array.from(new Set(icons.map(i => iconMap[i] || i))).join(', ');
      return `import { ${newIcons} } from "@heroicons/react/24/outline"`;
    });

    if (modified) {
      // Replace JSX tags
      iconsToReplace.forEach(oldIcon => {
        const newIcon = iconMap[oldIcon];
        if (newIcon && newIcon !== oldIcon) {
          // Replace <Icon ... to <NewIcon ...
          const tagRegex = new RegExp(`<${oldIcon}(\\s|>)`, 'g');
          content = content.replace(tagRegex, `<${newIcon}$1`);
          
          // Replace closing tags </Icon>
          const closeTagRegex = new RegExp(`<\/${oldIcon}>`, 'g');
          content = content.replace(closeTagRegex, `<\/${newIcon}>`);
          
          // Replace object references (like in stat.icon or icon={Settings})
          // We look for word boundaries around the oldIcon, but not if it's already caught by JSX.
          const refRegex = new RegExp(`\\b${oldIcon}\\b(?!-)`, 'g');
          content = content.replace(refRegex, newIcon);
        }
      });
      
      fs.writeFileSync(f, content, 'utf8');
      console.log(`Updated ${f}`);
    }
  });
  console.log("Done replacing icons.");
} catch (e) {
  console.error(e.message);
}
