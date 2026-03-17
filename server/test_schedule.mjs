import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  try {
    // get a scheduleset
    let set = await prisma.scheduleset.findFirst();
    if (!set) {
      set = await prisma.scheduleset.create({ data: { id: crypto.randomUUID(), name: 'Test Set' }});
    }

    // get a department
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({ data: { id: crypto.randomUUID(), name: 'Test Dept' }});
    }

    // Try upserting a scheduleentry
    console.log('Upserting...');
    const result = await prisma.scheduleentry.upsert({
      where: {
        scheduleSetId_departmentId_dayOfWeek: {
          scheduleSetId: set.id,
          departmentId: dept.id,
          dayOfWeek: 1
        }
      },
      update: {
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      },
      create: {
        id: crypto.randomUUID(),
        scheduleSetId: set.id,
        departmentId: dept.id,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      }
    });

    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
