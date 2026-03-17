const fs = require('fs');
const path = require('path');

const files = [
  'attendance.ts',
  'locations.ts',
  'leaves.ts',
  'recap.ts',
  'payroll.ts',
  'payroll_management.ts',
  'schedules.ts'
];

const replacements = [
  [/prisma\.scheduleSet/g, 'prisma.scheduleset'],
  [/prisma\.scheduleEntry/g, 'prisma.scheduleentry'],
  [/scheduleEntry:/g, 'scheduleentry:'],
  [/prisma\.locationSetting/g, 'prisma.locationsetting'],
  [/prisma\.activityLog/g, 'prisma.activitylog'],
  [/prisma\.leaveRequest/g, 'prisma.leaverequest'],
  [/prisma\.payrollConfig/g, 'prisma.payrollconfig'],
  [/prisma\.payrollRate/g, 'prisma.payrollrate'],
  [/\.scheduleSet/g, '.scheduleset'],
  [/\.scheduleEntry/g, '.scheduleentry'],
  [/\.locationSetting/g, '.locationsetting'],
  [/\.activityLog/g, '.activitylog'],
  [/\.leaveRequest/g, '.leaverequest'],
  [/\.breakLog/g, '.breaklog'],
  [/\.payrollConfig/g, '.payrollconfig'],
  [/\.payrollRate/g, '.payrollrate']
];

const routesDir = 'c:/Users/HYRA/Documents/PROJECT/ASIPP/server/src/routes';

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
