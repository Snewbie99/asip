import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Prisma Property Check ---');
  const prismaKeys = Object.keys(prisma);
  console.log('Prisma keys (subset):', prismaKeys.filter(k => k.toLowerCase().includes('schedule') || k.toLowerCase().includes('attendance')));

  try {
    const schedules = await (prisma as any).scheduleSet.findMany({
      take: 1
    });
    console.log('Successfully called prisma.scheduleSet');
    if (schedules.length > 0) {
      console.log('Sample Schedule keys:', Object.keys(schedules[0]));
    }
  } catch (e) {
    console.log('Failed calling prisma.scheduleSet:', e.message);
  }

  try {
    const schedules = await (prisma as any).scheduleset.findMany({
      take: 1
    });
    console.log('Successfully called prisma.scheduleset');
    if (schedules.length > 0) {
      console.log('Sample scheduleset keys:', Object.keys(schedules[0]));
    }
  } catch (e) {
    console.log('Failed calling prisma.scheduleset:', e.message);
  }

  // Check relations
  try {
    const scheduleWithRel = await (prisma as any).scheduleSet.findFirst({
      include: { scheduleEntry: true }
    });
    console.log('Include scheduleEntry success');
  } catch (e) {
    console.log('Include scheduleEntry failed:', e.message);
  }

  try {
    const scheduleWithRel = await (prisma as any).scheduleset.findFirst({
      include: { scheduleentry: true }
    });
    console.log('Include scheduleentry success');
  } catch (e) {
    console.log('Include scheduleentry failed:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
