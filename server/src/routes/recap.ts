import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { parseTimeToMinutes } from '../lib/utils';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/recap/debug
router.get('/debug', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    const data = await (prisma.user as any).findMany({
      where: { role: 'PEGAWAI' },
      include: {
        attendance: {
          where: { date },
          include: { breaklog: true }
        }
      }
    });
    return res.json({ date, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/recap/daily?date=YYYY-MM-DD&departmentId=X&name=Y
router.get('/daily', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const deptId = req.query.departmentId as string;
    const nameSearch = req.query.name as string;

    const date = new Date(dateStr);
    
    const where: any = { role: 'PEGAWAI' };
    if (deptId && deptId !== '') where.departmentId = deptId;
    if (nameSearch && nameSearch !== '') {
      where.name = { contains: nameSearch };
    }

    const employees = await ((prisma.user as any) as any).findMany({
      where,
      include: {
        department: true,
        attendance: {
          where: { date },
          include: { breaklog: { orderBy: { breakStart: 'asc' } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`[Recap] Processing ${employees.length} employees for date: ${dateStr}`);
    if (employees.length > 0) {
      const sample = employees.find((e: any) => e.attendance?.[0]?.breakLogs?.length > 0) || employees[0];
      console.log(`[Recap] Sample (${sample.name}) attendance:`, !!sample.attendance?.[0]);
      if (sample.attendance?.[0]) {
        console.log(`[Recap] Sample attendance breakLogs count:`, sample.attendance[0].breakLogs?.length);
      }
    }

    const recap = employees.map((emp: any) => {
      const att = emp.attendance?.[0];
      const brk = att?.breaklog?.[(att.breaklog?.length || 0) - 1]; // Get latest break
      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department?.name || '-',
        clockIn: att?.clockInTime || null,
        breakStart: brk?.breakStart || null,
        breakEnd: brk?.breakEnd || null,
        clockOut: att?.clockOutTime || null,
        status: att?.status || 'ALPA'
      };
    });

    return res.json(recap);
  } catch (error) {
    console.error('Daily recap error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/recap?startDate=X&endDate=Y&departmentId=Z&name=N
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, departmentId, name } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = { role: 'PEGAWAI' };
    if (departmentId && departmentId !== '') where.departmentId = departmentId as string;
    if (name && name !== '') where.name = { contains: name as string };

    const employees = await (prisma.user as any).findMany({
      where,
      include: { department: true },
      orderBy: { name: 'asc' },
    });

    console.log(`[Recap] Found ${employees.length} employees for query:`, { startDate, endDate, departmentId, name });

    const recap = [];

    for (const emp of employees) {
      const attendances = await ((prisma.attendance as any) as any).findMany({
        where: {
          userId: emp.id,
          date: { gte: start, lte: end },
        },
        include: { breaklog: true },
      });

      let hariMasuk = 0;
      let late1to5Count = 0;
      let lateOver5Count = 0;
      let early1to5Count = 0;
      let earlyOver5Count = 0;
      let breakUnder1hCount = 0;
      let breakOver1hCount = 0;
      let countIzin = 0;
      let countSakit = 0;
      let countCuti = 0;
      let countAlpa = 0;

      for (const att of (attendances as any[])) {
        if (att.status === 'HADIR') {
          hariMasuk++;
          
          // Terlambat
          if (att.lateMinutes >= 1 && att.lateMinutes <= 5) {
            late1to5Count++;
          } else if (att.lateMinutes > 5) {
            lateOver5Count++;
          }

          // Pulang Cepat
          if (att.earlyLeaveMin >= 1 && att.earlyLeaveMin <= 5) {
            early1to5Count++;
          } else if (att.earlyLeaveMin > 5) {
            earlyOver5Count++;
          }

          const brkList = att.breaklog || [];
          for (const brk of brkList) {
            if (brk.durationMin !== null) {
              if (brk.durationMin > 60) {
                breakOver1hCount++;
              } else if (brk.durationMin < 60 && brk.durationMin > 0) {
                breakUnder1hCount++;
              }
            }
          }
        } else if (att.status === 'IZIN') countIzin++;
        else if (att.status === 'SAKIT') countSakit++;
        else if (att.status === 'CUTI') countCuti++;
        else if (att.status === 'ALPA') countAlpa++;
      }

      recap.push({
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department?.name || '-',
        hariMasuk,
        late1to5Count,
        lateOver5Count,
        early1to5Count,
        earlyOver5Count,
        breakUnder1hCount,
        breakOver1hCount,
        countIzin,
        countSakit,
        countCuti,
        countAlpa,
      });
    }

    return res.json(recap);
  } catch (error) {
    console.error('Recap error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/recap/upsert
router.post('/upsert', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, date, status, clockInTime, clockOutTime } = req.body;

    if (!userId || !date || !status) {
      return res.status(400).json({ error: 'UserID, Tanggal, dan Status wajib diisi' });
    }

    const attendanceDate = new Date(date);
    // Ensure it's treated as a date only (UTC midnight is the local standard for YYYY-MM-DD strings)

    // Calculate late/early if HADIR
    let lateMinutes = 0;
    let earlyLeaveMin = 0;

    if (status === 'HADIR' && clockInTime) {
      const user = await (prisma.user as any).findUnique({ where: { id: userId } });
      const activeSchedule = await (prisma.scheduleSet as any).findFirst({ where: { isActive: true } });
      if (activeSchedule && user?.departmentId) {
        const scheduleEntry = await (prisma.scheduleEntry as any).findUnique({
          where: {
            scheduleSetId_departmentId_dayOfWeek: {
              scheduleSetId: activeSchedule.id,
              departmentId: user.departmentId,
              dayOfWeek: attendanceDate.getDay()
            }
          }
        });
        if (scheduleEntry) {
          const schedStart = parseTimeToMinutes(scheduleEntry.startTime);
          const inTime = new Date(clockInTime);
          const inTotalMin = inTime.getHours() * 60 + inTime.getMinutes();
          if (inTotalMin > schedStart) lateMinutes = inTotalMin - schedStart;

          if (clockOutTime) {
            const schedEnd = parseTimeToMinutes(scheduleEntry.endTime);
            const outTime = new Date(clockOutTime);
            const outTotalMin = outTime.getHours() * 60 + outTime.getMinutes();
            if (outTotalMin < schedEnd) earlyLeaveMin = schedEnd - outTotalMin;
          }
        }
      }
    }

    const data: any = {
      userId,
      date: attendanceDate,
      status,
      clockInTime: clockInTime ? new Date(clockInTime) : null,
      clockOutTime: clockOutTime ? new Date(clockOutTime) : null,
      lateMinutes,
      earlyLeaveMin,
    };

    const result = await (prisma.attendance as any).upsert({
      where: { userId_date: { userId, date: attendanceDate } },
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

    // Handle BreakLog upsert
    const { breakStart, breakEnd } = req.body;
    if (breakStart || breakEnd) {
      const bStart = breakStart ? new Date(breakStart) : null;
      const bEnd = breakEnd ? new Date(breakEnd) : null;
      let durationMin = null;
      
      if (bStart && bEnd) {
        durationMin = Math.round((bEnd.getTime() - bStart.getTime()) / 60000);
      }

      const existingBreak = await (prisma.breakLog as any).findFirst({
        where: { attendanceId: result.id }
      });

      if (existingBreak) {
        await (prisma.breakLog as any).update({
          where: { id: existingBreak.id },
          data: {
            breakStart: bStart || existingBreak.breakStart,
            breakEnd: bEnd,
            durationMin
          }
        });
      } else if (bStart) {
        await (prisma.breakLog as any).create({
          data: {
            id: crypto.randomUUID(),
            attendanceId: result.id,
            userId,
            breakStart: bStart,
            breakEnd: bEnd,
            durationMin
          }
        });
      }
    }

    return res.json({ message: 'Data absensi berhasil diperbarui', attendance: result });
  } catch (error: any) {
    console.error('Upsert attendance error:', error);
    return res.status(500).json({ error: error?.message || 'Terjadi kesalahan server' });
  }
});

export default router;
