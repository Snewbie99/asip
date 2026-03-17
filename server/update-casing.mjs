import fs from 'fs';
import path from 'path';

const routesDir = 'C:/Users/HYRA/Documents/PROJECT/ASIPP/server/src/routes';
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

files.forEach((file) => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Update to camelCase accessors to match the new Prisma Client generation
  content = content.replace(/prisma\.scheduleset/g, 'prisma.scheduleSet');
  content = content.replace(/prisma\.scheduleentry/g, 'prisma.scheduleEntry');
  content = content.replace(/prisma\.locationsetting/g, 'prisma.locationSetting');
  content = content.replace(/prisma\.activitylog/g, 'prisma.activityLog');
  content = content.replace(/prisma\.breaklog/g, 'prisma.breakLog');
  content = content.replace(/prisma\.leaverequest/g, 'prisma.leaveRequest');
  content = content.replace(/prisma\.payrollconfig/g, 'prisma.payrollConfig');
  content = content.replace(/prisma\.payrollrate/g, 'prisma.payrollRate');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated casing in: ${file}`);
});
