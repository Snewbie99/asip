import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, employeeId: true, name: true } });
  const depts = await prisma.department.findMany();
  const scheduleSets = await prisma.scheduleSet.findMany({ where: { isActive: true }, include: { scheduleentry: true } });

  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('--- DEPARTMENTS ---');
  console.log(JSON.stringify(depts, null, 2));
  console.log('--- ACTIVE SCHEDULES ---');
  console.log(JSON.stringify(scheduleSets, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
