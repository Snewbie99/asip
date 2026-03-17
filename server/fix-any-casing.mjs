import fs from 'fs';
import path from 'path';

const routesDir = 'C:/Users/HYRA/Documents/PROJECT/ASIPP/server/src/routes';
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

files.forEach((file) => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // This time match either "prisma." or "(prisma as any)." or "prisma.someModel."
  const mapping = {
    'scheduleset': 'scheduleSet',
    'scheduleentry': 'scheduleEntry',
    'locationsetting': 'locationSetting',
    'activitylog': 'activityLog',
    'breaklog': 'breakLog',
    'leaverequest': 'leaveRequest',
    'payrollconfig': 'payrollConfig',
    'payrollrate': 'payrollRate'
  };

  for (const [lower, camel] of Object.entries(mapping)) {
    // Regex matches `.tableName` where it is preceded by an alphanumeric, ) or .
    const regex = new RegExp(`\\.${lower}\\b`, 'g');
    content = content.replace(regex, `.${camel}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated all casing flavors in: ${file}`);
});
