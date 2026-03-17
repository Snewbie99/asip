import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runDiagnostics() {
  console.log('--- START DIAGNOSTICS ---');

  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }});
  if (!admin) {
    admin = await prisma.user.create({ data: {
      id: crypto.randomUUID(), employeeId: 'A001', name: 'Admin', password: 'asd', role: 'ADMIN', updatedAt: new Date()
    }});
  }

  let dept = await prisma.department.findFirst();
  if (!dept) {
    dept = await prisma.department.create({ data: { id: crypto.randomUUID(), name: 'Test Dept' }});
  }

  let scheduleSet = await prisma.scheduleset.findFirst();
  if (!scheduleSet) {
    scheduleSet = await prisma.scheduleset.create({ data: { id: crypto.randomUUID(), name: 'Test Set' }});
  }

  console.log('1. Testing schedules.ts "POST /api/schedules/:id/entries" logic...');
  try {
    const entryData = {
      departmentId: dept.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00'
    };
    const res = await prisma.scheduleentry.upsert({
      where: {
        scheduleSetId_departmentId_dayOfWeek: {
          scheduleSetId: scheduleSet.id,
          departmentId: entryData.departmentId,
          dayOfWeek: entryData.dayOfWeek,
        }
      },
      update: {
        startTime: entryData.startTime,
        endTime: entryData.endTime,
        breakStart: null,
        breakEnd: null,
      },
      create: {
        id: crypto.randomUUID(),
        scheduleSetId: scheduleSet.id,
        departmentId: entryData.departmentId,
        dayOfWeek: entryData.dayOfWeek,
        startTime: entryData.startTime,
        endTime: entryData.endTime,
        breakStart: null,
        breakEnd: null,
      }
    });
    console.log(' -> Schedule OK:', res.id);
  } catch (e) {
    console.error(' -> Schedule FAILED:', e);
  }

  console.log('2. Testing recap.ts "POST /api/recap/upsert" logic...');
  try {
    const data = {
      userId: admin.id,
      date: new Date('2026-03-20T00:00:00.000Z'),
      status: 'HADIR',
      clockInTime: new Date('2026-03-20T08:00:00.000Z'),
      clockOutTime: new Date('2026-03-20T17:00:00.000Z'),
      lateMinutes: 0,
      earlyLeaveMin: 0,
    };
    const res = await prisma.attendance.upsert({
      where: { userId_date: { userId: data.userId, date: data.date } },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        ...data,
        updatedAt: new Date()
      }
    });
    console.log(' -> Recap OK:', res.id);
  } catch (e) {
    console.error(' -> Recap FAILED:', e);
  }

  console.log('3. Testing attendance.ts "POST /api/attendance/clock-out" logic...');
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: admin.id, date: new Date('2026-03-20T00:00:00.000Z') } }
    });
    if (attendance) {
      const res = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          clockOutTime: new Date(),
          clockOutLat: -6.2,
          clockOutLng: 106.8,
          earlyLeaveMin: 10,
          updatedAt: new Date(),
        }
      });
      console.log(' -> Clock-out OK:', res.id);
    } else {
      console.log(' -> Clock-out FAILED: Attendance not found');
    }
  } catch (e) {
    console.error(' -> Clock-out FAILED:', e);
  }

  console.log('--- END DIAGNOSTICS ---');
}

runDiagnostics().finally(() => prisma.$disconnect());
