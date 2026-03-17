import fs from 'fs';
import path from 'path';

// Define the absolute path to your routes directory
const routesDir = 'C:/Users/HYRA/Documents/PROJECT/ASIPP/server/src/routes';

// Read all files in the directory
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

files.forEach((file) => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Revert all camelCase Prisma accessors back to lowercase
  content = content.replace(/prisma\.scheduleSet/g, 'prisma.scheduleset');
  content = content.replace(/prisma\.scheduleEntry/g, 'prisma.scheduleentry');
  content = content.replace(/prisma\.locationSetting/g, 'prisma.locationsetting');
  content = content.replace(/prisma\.activityLog/g, 'prisma.activitylog');
  content = content.replace(/prisma\.breakLog/g, 'prisma.breaklog');
  content = content.replace(/prisma\.leaveRequest/g, 'prisma.leaverequest');
  content = content.replace(/prisma\.payrollConfig/g, 'prisma.payrollconfig');
  content = content.replace(/prisma\.payrollRate/g, 'prisma.payrollrate');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Reverted casing in: ${file}`);
});
